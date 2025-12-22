import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private coursesService: CoursesService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
    private couponsService: CouponsService,
  ) { }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Generate order number explicitly to ensure it's always set
    const count = await this.orderModel.countDocuments();
    const orderNumber = `ORD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // Use provided totals (they should already be calculated from the checkout)
    const subtotal = createOrderDto.subtotal || 0;
    const tax = createOrderDto.tax || 0;
    const total = createOrderDto.total || 0;

    // Increment coupon usage if coupon is present
    if (createOrderDto.coupon) {
      await this.couponsService.incrementUsage(createOrderDto.coupon);
    }

    const order = new this.orderModel({
      ...createOrderDto,
      orderNumber, // Explicitly set order number to prevent validation error
      subtotal,
      tax,
      total,
      courses: createOrderDto.courses?.map((id) => new Types.ObjectId(id)) || [],
      user: new Types.ObjectId(createOrderDto.user),
      coupon: createOrderDto.coupon ? new Types.ObjectId(createOrderDto.coupon) : undefined,
    });

    return await order.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: OrderStatus,
    userId?: string,
  ): Promise<{ orders: Order[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.user = new Types.ObjectId(userId);
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('user', 'firstName lastName email')
        .populate('courses', 'title slug price thumbnail')
        .populate('affiliate', 'firstName lastName email')
        .populate('coupon', 'code value type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { orders, total };
  }

  async findById(id: string): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('user', 'firstName lastName email phone')
      .populate('courses', 'title slug price thumbnail instructor')
      .populate('affiliate', 'firstName lastName email')
      .populate('coupon', 'code value type')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({ orderNumber })
      .populate('user', 'firstName lastName email phone')
      .populate('courses', 'title slug price thumbnail instructor')
      .populate('coupon', 'code value type')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title slug price thumbnail')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    reason?: string,
  ): Promise<Order> {
    const updateData: any = { status };

    if (status === OrderStatus.CANCELLED && reason) {
      updateData.cancellationReason = reason;
    }

    if (status === OrderStatus.COMPLETED) {
      updateData.paidAt = new Date();
    }

    const order = await this.orderModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Send notification
    if (status === OrderStatus.COMPLETED) {
      const user = await this.usersService.findById(order.user.toString());
      await this.notificationsService.sendPaymentSuccessNotification(
        user.id,
        order,
      );
    }

    return order;
  }

  async remove(id: string): Promise<void> {
    const result = await this.orderModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Order not found');
    }
  }

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number }> {
    return this.findAll(page, limit, undefined, userId);
  }

  async getRevenueByDateRange(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    return await this.orderModel.aggregate([
      {
        $match: {
          status: OrderStatus.COMPLETED,
          paidAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
          },
          amount: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getEnrollmentsByDateRange(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    return await this.orderModel.aggregate([
      {
        $match: {
          status: OrderStatus.COMPLETED,
          paidAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$paidAt' },
          },
          count: { $sum: { $size: '$courses' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getEnrollmentsByCountry(): Promise<any[]> {
    return await this.orderModel.aggregate([
      {
        $match: {
          status: OrderStatus.COMPLETED,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $group: {
          _id: '$user.country',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async countCompletedOrders(): Promise<number> {
    return await this.orderModel.countDocuments({
      status: OrderStatus.COMPLETED,
    });
  }

  async findCompletedOrders(): Promise<Order[]> {
    return await this.orderModel
      .find({ status: OrderStatus.COMPLETED })
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title slug')
      .exec();
  }

  async processRefund(
    orderId: string,
    refundData: {
      amount?: number;
      reason: string;
      processedBy: string;
    },
  ): Promise<Order> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be refunded');
    }

    const refundAmount = refundData.amount || order.total;

    if (refundAmount > order.total) {
      throw new BadRequestException('Refund amount cannot exceed order total');
    }

    order.status = OrderStatus.REFUNDED;
    order.refund = {
      amount: refundAmount,
      reason: refundData.reason,
      processedAt: new Date(),
      processedBy: new Types.ObjectId(refundData.processedBy),
    };

    await order.save();

    // Send notification
    const user = await this.usersService.findById(order.user.toString());
    await this.notificationsService.sendNotification({
      user: user.id,
      title: 'Order Refunded',
      message: `Your order ${order.orderNumber} has been refunded.`,
      type: NotificationType.IN_APP,
    });

    return order;
  }

  async resendReceipt(orderId: string): Promise<{ message: string }> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Receipt can only be sent for completed orders');
    }

    const user = await this.usersService.findById(order.user.toString());

    // Send notification with receipt
    await this.notificationsService.sendNotification({
      user: user.id,
      title: 'Order Receipt',
      message: `Receipt for order ${order.orderNumber}`,
      type: NotificationType.IN_APP,
    });

    return { message: 'Receipt sent successfully' };
  }

  async exportOrders(format: 'csv' | 'excel'): Promise<any> {
    const orders = await this.orderModel
      .find()
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title price')
      .sort({ createdAt: -1 })
      .exec();

    if (format === 'csv') {
      const csvRows = [
        ['Order Number', 'Customer', 'Email', 'Date', 'Status', 'Total', 'Items'].join(','),
      ];

      orders.forEach(order => {
        const user = order.user as any;
        const customerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'N/A';
        const email = user?.email || 'N/A';
        const row = [
          order.orderNumber,
          `"${customerName}"`,
          email,
          new Date((order as any).createdAt).toLocaleDateString(),
          order.status,
          order.total.toFixed(2),
          order.courses.length,
        ].join(',');
        csvRows.push(row);
      });

      return csvRows.join('\n');
    }

    return orders;
  }

  async downloadOrder(orderId: string, userId: string): Promise<{ url: string }> {
    const order = await this.orderModel.findOne({
      _id: orderId,
      user: userId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // In production, generate a PDF and return a signed URL
    // For now, return a mock URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/api/orders/${orderId}/receipt.pdf`,
    };
  }

  async getOrderStats(): Promise<any> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      cancelledOrders,
      refundedOrders,
      totalRevenue,
      weeklyOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }),
      this.orderModel.countDocuments({ status: OrderStatus.PROCESSING }),
      this.orderModel.countDocuments({ status: OrderStatus.SHIPPED }),
      this.orderModel.countDocuments({ status: OrderStatus.CANCELLED }),
      this.orderModel.countDocuments({ status: OrderStatus.REFUNDED }),
      this.orderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.countDocuments({
        createdAt: { $gte: lastWeek },
      }),
    ]);

    return {
      totalOrders,
      completed: completedOrders,
      pending: pendingOrders,
      processing: processingOrders,
      shipped: shippedOrders,
      cancelled: cancelledOrders,
      refunded: refundedOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      weeklyGrowth: weeklyOrders,
    };
  }
}
