import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TransactionFiltersDto,
  InvoiceFiltersDto,
  PayoutFiltersDto,
  AnalyticsFiltersDto,
  CreateInvoiceDto,
  ProcessRefundDto,
  ProcessPayoutDto,
  PaymentStatus,
  InvoiceStatus,
  PayoutStatus,
  ExportFormat,
} from './dto/admin-payments.dto';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectModel('Transaction') private paymentModel: Model<any>,
    @InjectModel('Invoice') private invoiceModel: Model<any>,
    @InjectModel('Payout') private payoutModel: Model<any>,
    @InjectModel('Order') private orderModel: Model<any>,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  /**
   * Get all transactions with pagination and filters
   */
  async getAllTransactions(filters: TransactionFiltersDto) {
    const {
      page = 1,
      limit = 10,
      status,
      method,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (method) {
      query.method = method;
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .populate('user', 'name email avatar')
        .populate('order', 'orderNumber items')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      transactions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionById(id: string) {
    const transaction = await this.paymentModel
      .findById(id)
      .populate('user', 'name email avatar phone')
      .populate({
        path: 'order',
        populate: {
          path: 'items.course',
          select: 'title thumbnail instructor',
        },
      })
      .lean();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Get refund history if exists
    const refunds = await this.paymentModel
      .find({ originalPaymentId: id, status: PaymentStatus.REFUNDED })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...transaction,
      refunds,
    };
  }

  /**
   * Process admin refund
   */
  async processAdminRefund(transactionId: string, refundDto: ProcessRefundDto) {
    const transaction = await this.paymentModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Transaction already refunded');
    }

    if (transaction.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed transactions');
    }

    const { reason, amount, notes } = refundDto;
    const refundAmount = amount || transaction.amount;

    // Validate refund amount
    if (refundAmount > transaction.amount) {
      throw new BadRequestException('Refund amount exceeds transaction amount');
    }

    // Create refund record
    const refund = new this.paymentModel({
      user: transaction.user,
      order: transaction.order,
      amount: -refundAmount,
      method: transaction.method,
      status: PaymentStatus.REFUNDED,
      originalPaymentId: transaction._id,
      refundReason: reason,
      refundNotes: notes,
      transactionId: `REF-${Date.now()}`,
    });

    await refund.save();

    // Update original transaction
    const isPartialRefund = refundAmount < transaction.amount;
    transaction.status = isPartialRefund
      ? PaymentStatus.PARTIAL_REFUND
      : PaymentStatus.REFUNDED;
    transaction.refundedAmount =
      (transaction.refundedAmount || 0) + refundAmount;
    transaction.refundedAt = new Date();

    await transaction.save();

    // TODO: Process actual refund with payment gateway (Stripe/PayPal)
    // await this.processGatewayRefund(transaction, refundAmount);

    // TODO: Update order status and revoke enrollment if needed
    if (transaction.order) {
      await this.orderModel.findByIdAndUpdate(transaction.order, {
        status: 'refunded',
        refundedAt: new Date(),
      });
    }

    // TODO: Send refund notification email
    // await this.notificationService.sendRefundNotification(transaction.user, refund);

    return {
      success: true,
      message: 'Refund processed successfully',
      refund,
      transaction,
    };
  }

  /**
   * Get all invoices with pagination and filters
   */
  async getAllInvoices(filters: InvoiceFiltersDto) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .populate('user', 'name email avatar')
        .populate('course', 'title thumbnail')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments(query),
    ]);

    return {
      invoices,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get invoice details by ID
   */
  async getInvoiceById(id: string) {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('user', 'name email avatar phone address')
      .populate('course', 'title thumbnail instructor')
      .lean();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Create a manual invoice
   */
  async createManualInvoice(createInvoiceDto: CreateInvoiceDto) {
    const {
      userId,
      courseId,
      lineItems,
      taxRate = 0,
      discount = 0,
      notes,
      dueDate,
      status = InvoiceStatus.DRAFT,
      billingName,
      billingEmail,
      billingAddress,
    } = createInvoiceDto;

    // Verify user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate totals
    let subtotal = 0;
    const processedLineItems = lineItems.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      return {
        ...item,
        total: lineTotal,
      };
    });

    const taxAmount = (subtotal * taxRate) / 100;
    const discountAmount = discount;
    const total = subtotal + taxAmount - discountAmount;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    // Create invoice
    const invoice = new this.invoiceModel({
      invoiceNumber,
      user: userId,
      course: courseId,
      lineItems: processedLineItems,
      subtotal,
      taxRate,
      taxAmount,
      discount: discountAmount,
      total,
      status,
      notes,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      billingInfo: {
        name: billingName || user.name,
        email: billingEmail || user.email,
        address: billingAddress || user.address,
      },
    });

    await invoice.save();

    // TODO: Send invoice email
    // if (status === InvoiceStatus.SENT) {
    //   await this.sendInvoiceEmail(invoice);
    // }

    return invoice;
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, updateData: Partial<CreateInvoiceDto>) {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Recalculate if line items changed
    if (updateData.lineItems) {
      let subtotal = 0;
      const processedLineItems = updateData.lineItems.map((item) => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        return {
          ...item,
          total: lineTotal,
        };
      });

      const taxRate = updateData.taxRate || invoice.taxRate;
      const discount = updateData.discount || invoice.discount;
      const taxAmount = (subtotal * taxRate) / 100;
      const total = subtotal + taxAmount - discount;

      Object.assign(invoice, {
        ...updateData,
        lineItems: processedLineItems,
        subtotal,
        taxAmount,
        total,
      });
    } else {
      Object.assign(invoice, updateData);
    }

    await invoice.save();

    return invoice;
  }

  /**
   * Delete invoice (soft delete)
   */
  async deleteInvoice(id: string) {
    const invoice = await this.invoiceModel.findById(id);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.deletedAt = new Date();
    await invoice.save();

    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  /**
   * Get all payouts with pagination and filters
   */
  async getAllPayouts(filters: PayoutFiltersDto) {
    const {
      page = 1,
      limit = 10,
      status,
      instructorId,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (instructorId) {
      query.instructor = instructorId;
    }

    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'instructor.name': { $regex: search, $options: 'i' } },
        { 'instructor.email': { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query
    const skip = (page - 1) * limit;
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [payouts, total] = await Promise.all([
      this.payoutModel
        .find(query)
        .populate('instructor', 'name email avatar')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.payoutModel.countDocuments(query),
    ]);

    return {
      payouts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payout details for instructor
   */
  async getPayoutDetails(instructorId: string) {
    // Calculate pending earnings
    const pendingEarnings =
      await this.calculateInstructorEarnings(instructorId);

    // Get recent payouts
    const recentPayouts = await this.payoutModel
      .find({ instructor: instructorId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get total paid amount
    const totalPaid = await this.payoutModel.aggregate([
      {
        $match: {
          instructor: instructorId,
          status: PayoutStatus.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return {
      instructor: await this.userModel
        .findById(instructorId)
        .select('name email avatar'),
      pendingEarnings,
      totalPaid: totalPaid[0]?.total || 0,
      recentPayouts,
    };
  }

  /**
   * Process instructor payout
   */
  async processInstructorPayout(
    instructorId: string,
    payoutDto: ProcessPayoutDto,
  ) {
    const { amount, notes, periodStart, periodEnd } = payoutDto;

    // Verify instructor exists
    const instructor = await this.userModel.findById(instructorId);
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Calculate available earnings
    const availableEarnings =
      await this.calculateInstructorEarnings(instructorId);

    if (amount > availableEarnings) {
      throw new BadRequestException('Payout amount exceeds available earnings');
    }

    // Create payout record
    const payout = new this.payoutModel({
      instructor: instructorId,
      amount,
      status: PayoutStatus.PROCESSING,
      transactionId: `PAYOUT-${Date.now()}`,
      notes,
      periodStart:
        periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: periodEnd || new Date(),
    });

    await payout.save();

    // TODO: Process actual payout with payment gateway
    // await this.processGatewayPayout(instructor, amount);

    // Update payout status
    payout.status = PayoutStatus.COMPLETED;
    payout.processedAt = new Date();
    await payout.save();

    // TODO: Send payout notification email
    // await this.notificationService.sendPayoutNotification(instructor, payout);

    return {
      success: true,
      message: 'Payout processed successfully',
      payout,
    };
  }

  /**
   * Get payout history for instructor
   */
  async getPayoutHistory(instructorId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      this.payoutModel
        .find({ instructor: instructorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.payoutModel.countDocuments({ instructor: instructorId }),
    ]);

    return {
      history,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(filters: AnalyticsFiltersDto) {
    const { period = '30d', startDate, endDate } = filters;

    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      const days = this.parsePeriodToDays(period);
      dateFilter = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    // Revenue overview
    const overview = await this.paymentModel.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentStatus.COMPLETED] },
                '$amount',
                0,
              ],
            },
          },
          successfulPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.COMPLETED] }, 1, 0],
            },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', PaymentStatus.FAILED] }, 1, 0] },
          },
          refundedPayments: {
            $sum: {
              $cond: [{ $eq: ['$status', PaymentStatus.REFUNDED] }, 1, 0],
            },
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', PaymentStatus.REFUNDED] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const overviewData = overview[0] || {
      totalRevenue: 0,
      successfulPayments: 0,
      failedPayments: 0,
      refundedPayments: 0,
      refundedAmount: 0,
    };

    // Calculate refund rate
    const totalPayments =
      overviewData.successfulPayments + overviewData.refundedPayments;
    overviewData['refundRate'] =
      totalPayments > 0
        ? (overviewData.refundedPayments / totalPayments) * 100
        : 0;

    // Payment method breakdown
    const methodBreakdown = await this.paymentModel.aggregate([
      { $match: { createdAt: dateFilter, status: PaymentStatus.COMPLETED } },
      {
        $group: {
          _id: '$method',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Status breakdown
    const statusBreakdown = await this.paymentModel.aggregate([
      { $match: { createdAt: dateFilter } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue by day
    const revenueByDay = await this.paymentModel.aggregate([
      { $match: { createdAt: dateFilter, status: PaymentStatus.COMPLETED } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      overview: overviewData,
      methodBreakdown: methodBreakdown.map((item) => ({
        method: item._id,
        total: item.total,
        count: item.count,
      })),
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item._id,
        count: item.count,
      })),
      revenueByDay: revenueByDay.map((item) => ({
        date: item._id,
        revenue: item.revenue,
        count: item.count,
      })),
    };
  }

  /**
   * Export transactions
   */
  async exportTransactions(
    filters: TransactionFiltersDto,
    format: ExportFormat,
  ) {
    // Get all transactions (no pagination for export)
    const { page, limit, ...queryFilters } = filters;
    const query = this.buildTransactionQuery(queryFilters);

    const transactions = await this.paymentModel
      .find(query)
      .populate('user', 'name email')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .lean();

    if (format === ExportFormat.CSV) {
      return this.generateCSV(transactions);
    } else if (format === ExportFormat.JSON) {
      return this.generateJSON(transactions);
    }

    throw new BadRequestException('Unsupported export format');
  }

  // Helper methods

  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: { $regex: `^INV-${year}${month}` },
    });

    const sequential = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequential}`;
  }

  private async calculateInstructorEarnings(
    instructorId: string,
  ): Promise<number> {
    // Get completed orders for instructor's courses
    const earnings = await this.orderModel.aggregate([
      {
        $match: {
          status: 'completed',
          'items.instructor': instructorId,
        },
      },
      {
        $unwind: '$items',
      },
      {
        $match: {
          'items.instructor': instructorId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$items.instructorShare' },
        },
      },
    ]);

    const totalEarnings = earnings[0]?.total || 0;

    // Subtract already paid amounts
    const paidAmount = await this.payoutModel.aggregate([
      {
        $match: {
          instructor: instructorId,
          status: { $in: [PayoutStatus.COMPLETED, PayoutStatus.PROCESSING] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalPaid = paidAmount[0]?.total || 0;

    return totalEarnings - totalPaid;
  }

  private parsePeriodToDays(period: string): number {
    const match = period.match(/^(\d+)([dmy])$/);
    if (!match) return 30; // default

    const value = parseInt(match[1]);
    const unit = match[2];

    if (unit === 'd') return value;
    if (unit === 'm') return value * 30;
    if (unit === 'y') return value * 365;

    return 30;
  }

  private buildTransactionQuery(filters: any): any {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.method) {
      query.method = filters.method;
    }

    if (filters.search) {
      query.$or = [
        { transactionId: { $regex: filters.search, $options: 'i' } },
        { 'user.email': { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    return query;
  }

  private generateCSV(transactions: any[]) {
    const headers = [
      'Transaction ID',
      'User',
      'Email',
      'Amount',
      'Method',
      'Status',
      'Date',
    ];

    const rows = transactions.map((t) => [
      t.transactionId,
      t.user?.name || 'N/A',
      t.user?.email || 'N/A',
      t.amount,
      t.method,
      t.status,
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return {
      data: csvContent,
      contentType: 'text/csv',
    };
  }

  private generateJSON(transactions: any[]) {
    return {
      data: JSON.stringify(transactions, null, 2),
      contentType: 'application/json',
    };
  }
}
