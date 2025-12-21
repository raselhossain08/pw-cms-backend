import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { StripeService } from './providers/stripe.service';
import { PayPalService } from './providers/paypal.service';
import { OrdersService } from '../orders/orders.service';
import { CoursesService } from '../courses/courses.service';
import { ProductsService } from '../products/products.service';
import { CouponsService } from '../coupons/coupons.service';
import { MailService } from '../notifications/mail.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Invoice } from './entities/invoice.entity';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
    private stripeService: StripeService,
    private paypalService: PayPalService,
    private ordersService: OrdersService,
    private coursesService: CoursesService,
    private productsService: ProductsService,
    private couponsService: CouponsService,
    private mailService: MailService,
    private enrollmentsService: EnrollmentsService,
  ) { }

  async createPaymentIntent(
    createPaymentIntentDto: CreatePaymentIntentDto,
    userId: string,
  ) {
    const { amount, currency, paymentMethod, courseIds, description } =
      createPaymentIntentDto;

    const order = await this.ordersService.create({
      user: userId,
      courses: courseIds || [],
      subtotal: amount,
      total: amount,
      paymentMethod,
    });

    const metadata = {
      orderId: order.id,
      userId,
      courseIds: courseIds?.join(','),
    };

    let paymentResult;

    switch (paymentMethod) {
      case PaymentMethod.STRIPE:
        paymentResult = await this.stripeService.createPaymentIntent(
          amount,
          currency,
          metadata,
        );
        break;

      case PaymentMethod.PAYPAL:
        const items = courseIds ? await this.getCourseItems(courseIds) : [];
        paymentResult = await this.paypalService.createOrder(
          amount,
          currency,
          items,
        );
        break;

      default:
        throw new BadRequestException('Unsupported payment method');
    }

    await this.orderModel.findByIdAndUpdate(order.id, {
      paymentIntentId: paymentResult.paymentIntentId || paymentResult.orderId,
    });

    // Create transaction record
    await this.createTransaction({
      user: new Types.ObjectId(userId),
      amount,
      currency,
      type: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
      description: description || 'Course payment',
      gateway: paymentMethod,
      gatewayTransactionId:
        paymentResult.paymentIntentId || paymentResult.orderId,
      orderId: order.id,
    });

    return {
      ...paymentResult,
      orderNumber: order.orderNumber,
    };
  }

  async processPayment(processPaymentDto: ProcessPaymentDto, userId: string) {
    const { paymentIntentId, paymentMethod, orderNumber } = processPaymentDto;

    let order;
    if (orderNumber) {
      order = await this.orderModel.findOne({ orderNumber, user: userId });
    } else {
      order = await this.orderModel.findOne({ paymentIntentId, user: userId });
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    let paymentResult;

    try {
      switch (paymentMethod) {
        case PaymentMethod.STRIPE:
          paymentResult =
            await this.stripeService.confirmPayment(paymentIntentId);
          break;

        case PaymentMethod.PAYPAL:
          paymentResult =
            await this.paypalService.captureOrder(paymentIntentId);
          break;

        default:
          throw new BadRequestException('Unsupported payment method');
      }

      if (paymentResult.success || paymentResult.status === 'COMPLETED') {
        order.status = OrderStatus.COMPLETED;
        order.paidAt = new Date();
        order.chargeId = paymentResult.captureId || paymentResult.charge;
        await order.save();

        await this.createInvoice(order);
        await this.updateTransaction(
          paymentIntentId,
          TransactionStatus.COMPLETED,
          { gatewayResponse: paymentResult },
        );

        for (const courseId of order.courses) {
          await this.coursesService.incrementEnrollment(courseId.toString());
          await this.coursesService.addRevenue(
            courseId.toString(),
            order.total,
          );
        }

        return {
          success: true,
          order: order.orderNumber,
          message: 'Payment processed successfully',
        };
      } else {
        throw new BadRequestException('Payment processing failed');
      }
    } catch (error) {
      await this.orderModel.findByIdAndUpdate(order.id, {
        status: OrderStatus.FAILED,
      });

      await this.updateTransaction(paymentIntentId, TransactionStatus.FAILED, {
        failureReason: error.message,
      });

      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  async createTransaction(
    transactionData: Partial<Transaction>,
  ): Promise<Transaction> {
    const transaction = new this.transactionModel({
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...transactionData,
    });
    return await transaction.save();
  }

  async updateTransaction(
    gatewayTransactionId: string,
    status: TransactionStatus,
    updates: any = {},
  ): Promise<Transaction> {
    const transaction = await this.transactionModel.findOneAndUpdate(
      { gatewayTransactionId },
      {
        status,
        ...updates,
        ...(status === TransactionStatus.COMPLETED && {
          processedAt: new Date(),
        }),
      },
      { new: true },
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getUserTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments({ user: userId }),
    ]);

    return { transactions, total };
  }

  async handleStripeWebhook(payload: any, signature: string) {
    const { event, type } = await this.stripeService.handleWebhook(
      payload,
      signature,
    );

    switch (type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.handleSubscriptionPayment(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return { received: true };
  }

  async handlePayPalWebhook(payload: any, headers: any) {
    const eventType = payload.event_type;

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePayPalPaymentSuccess(payload);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await this.handlePayPalPaymentFailure(payload);
        break;

      default:
        console.log(`Unhandled PayPal event: ${eventType}`);
    }

    return { received: true };
  }

  async getUserInvoices(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find({ user: userId })
        .populate('order')
        .sort({ invoiceDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments({ user: userId }),
    ]);

    return { invoices, total, page, limit };
  }

  async getInvoice(invoiceId: string, userId: string) {
    const invoice = await this.invoiceModel
      .findOne({ _id: invoiceId, user: userId })
      .populate('order')
      .populate('user', 'firstName lastName email')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async downloadInvoice(invoiceId: string, userId: string): Promise<{ url: string }> {
    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      user: userId,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // In production, generate a PDF and return a signed URL
    // For now, return a mock URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/api/payments/invoices/${invoiceId}/download.pdf`,
    };
  }

  async requestRefund(orderId: string, reason: string, userId: string) {
    const order = await this.orderModel.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be refunded');
    }

    if (!order.paymentIntentId) {
      throw new BadRequestException('No payment information found for refund');
    }

    const refundDeadline = new Date(order.paidAt);
    refundDeadline.setDate(refundDeadline.getDate() + 30);

    if (new Date() > refundDeadline) {
      throw new BadRequestException('Refund period has expired');
    }

    let refundResult;

    try {
      if (order.paymentMethod === PaymentMethod.STRIPE) {
        refundResult = await this.stripeService.refundPayment(
          order.paymentIntentId,
        );
      } else {
        throw new BadRequestException(
          'Refunds for this payment method are not yet supported',
        );
      }

      order.status = OrderStatus.REFUNDED;
      order.refund = {
        amount: order.total,
        reason,
        processedAt: new Date(),
        processedBy: new Types.ObjectId(userId),
      };
      await order.save();

      await this.createTransaction({
        user: new Types.ObjectId(userId),
        amount: -order.total,
        currency: 'USD',
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        description: `Refund for order ${order.orderNumber}`,
        gateway: order.paymentMethod,
        gatewayTransactionId: refundResult.id,
        orderId: order.id,
      });

      return {
        success: true,
        refundId: refundResult.id,
        message: 'Refund processed successfully',
      };
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  private async createInvoice(order: Order) {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${((await this.invoiceModel.countDocuments()) + 1).toString().padStart(4, '0')}`;

    const invoice = new this.invoiceModel({
      invoiceNumber,
      order: order.id,
      user: order.user,
      amount: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: 'paid',
      invoiceDate: new Date(),
      dueDate: new Date(),
      billingInfo: order.billingAddress
        ? {
          companyName: `${order.billingAddress.firstName} ${order.billingAddress.lastName}`,
          address: order.billingAddress.street,
          city: order.billingAddress.city,
          state: order.billingAddress.state,
          zipCode: order.billingAddress.zipCode,
          country: order.billingAddress.country,
          taxId: '',
        }
        : {
          companyName: 'Personal Wings',
          address: '123 Aviation Way',
          city: 'Sky Harbor',
          state: 'AZ',
          zipCode: '85034',
          country: 'US',
          taxId: 'TAX-123456',
        },
      items: [
        {
          description: 'Course Enrollment',
          quantity: 1,
          unitPrice: order.subtotal,
          total: order.subtotal,
        },
      ],
      paidAt: order.paidAt,
    });

    return await invoice.save();
  }

  private async getCourseItems(courseIds: string[]) {
    const courses = await this.coursesService.findByIds(courseIds);
    return courses.map((course) => ({
      name: course.title,
      description: course.excerpt || 'Aviation training course',
      quantity: 1,
      price: course.price,
    }));
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    const order = await this.orderModel
      .findOne({
        paymentIntentId: paymentIntent.id,
      })
      .populate('user courses');

    if (order && order.status !== OrderStatus.COMPLETED) {
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      await order.save();

      await this.updateTransaction(
        paymentIntent.id,
        TransactionStatus.COMPLETED,
        { gatewayResponse: paymentIntent },
      );

      // Create enrollments for purchased courses
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      await this.createInvoice(order);

      // Send confirmation email
      const user = await this.userModel.findById(order.user);
      if (user) {
        await this.sendPurchaseConfirmationEmail(user, order);
      }
    }
  }

  private async handlePaymentFailure(paymentIntent: any) {
    const order = await this.orderModel.findOne({
      paymentIntentId: paymentIntent.id,
    });
    if (order) {
      order.status = OrderStatus.FAILED;
      await order.save();

      await this.updateTransaction(paymentIntent.id, TransactionStatus.FAILED, {
        failureReason:
          paymentIntent.last_payment_error?.message || 'Payment failed',
      });
    }
  }

  private async handleSubscriptionPayment(invoice: any) {
    console.log('Subscription payment handled:', invoice.id);
  }

  private async handlePayPalPaymentSuccess(payload: any) {
    const order = await this.orderModel
      .findOne({
        paymentIntentId: payload.resource.id,
      })
      .populate('user courses');

    if (order && order.status !== OrderStatus.COMPLETED) {
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      await order.save();

      await this.updateTransaction(
        payload.resource.id,
        TransactionStatus.COMPLETED,
        { gatewayResponse: payload },
      );

      // Create enrollments for purchased courses
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      await this.createInvoice(order);

      // Send confirmation email
      const user = await this.userModel.findById(order.user);
      if (user) {
        await this.sendPurchaseConfirmationEmail(user, order);
      }
    }
  }

  private async handlePayPalPaymentFailure(payload: any) {
    const order = await this.orderModel.findOne({
      paymentIntentId: payload.resource.id,
    });
    if (order) {
      order.status = OrderStatus.FAILED;
      await order.save();

      await this.updateTransaction(
        payload.resource.id,
        TransactionStatus.FAILED,
        {
          failureReason:
            payload.resource.status_details?.reason || 'Payment failed',
        },
      );
    }
  }

  async createStripeCheckoutSession(data: any, userId: string) {
    const { items, successUrl, cancelUrl, couponCode } = data;

    // Get course details
    const courseIds = items.map((item: any) => item.courseId);
    const courses = await this.coursesService.findByIds(courseIds);

    // Calculate total
    let subtotal = 0;
    const lineItems = courses.map((course, index) => {
      const quantity = items[index].quantity || 1;
      subtotal += course.price * quantity;

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: course.title,
            description: course.excerpt,
            images: course.thumbnail ? [course.thumbnail] : [],
          },
          unit_amount: Math.round(course.price * 100),
        },
        quantity,
      };
    });

    // Create order
    const order = await this.ordersService.create({
      user: userId,
      courses: courseIds,
      subtotal,
      total: subtotal,
      paymentMethod: PaymentMethod.STRIPE,
    });

    // Create Stripe session
    const session = await this.stripeService.createCheckoutSession({
      lineItems,
      successUrl,
      cancelUrl,
      metadata: {
        orderId: order.id,
        userId,
      },
    });

    await this.orderModel.findByIdAndUpdate(order.id, {
      paymentIntentId: session.id,
    });

    return { sessionId: session.id, orderNumber: order.orderNumber };
  }

  async createPayPalOrder(data: any, userId: string) {
    const { amount, currency, items } = data;

    const order = await this.ordersService.create({
      user: userId,
      courses: [],
      subtotal: amount,
      total: amount,
      paymentMethod: PaymentMethod.PAYPAL,
    });

    const paypalOrder = await this.paypalService.createOrder(
      amount,
      currency,
      items,
    );

    await this.orderModel.findByIdAndUpdate(order.id, {
      paymentIntentId: paypalOrder.orderId,
    });

    return {
      orderId: paypalOrder.orderId,
      status: paypalOrder.status,
      links: paypalOrder.links,
      orderNumber: order.orderNumber,
    };
  }

  async capturePayPalOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findOne({
      paymentIntentId: orderId,
      user: userId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const result = await this.paypalService.captureOrder(orderId);

    if (result.status === 'COMPLETED') {
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      await order.save();

      await this.createInvoice(order);

      return {
        success: true,
        orderNumber: order.orderNumber,
        message: 'Payment completed successfully',
      };
    }

    throw new BadRequestException('Payment capture failed');
  }

  async verifyStripeSession(sessionId: string, userId: string) {
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    const order = await this.orderModel.findOne({
      paymentIntentId: sessionId,
      user: userId,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      success: session.payment_status === 'paid',
      orderNumber: order.orderNumber,
      status: session.payment_status,
      amountTotal: (session.amount_total || 0) / 100,
    };
  }

  /**
   * Helper method to create enrollments for an order
   */
  private async createEnrollmentsForOrder(order: any) {
    const userId = (order.user as any)._id?.toString() || (order.user as any).toString();

    for (const courseId of order.courses) {
      const courseIdStr = (courseId as any)._id?.toString() || courseId.toString();

      try {
        // Check if user is already enrolled
        const existingEnrollment = await this.enrollmentsService.getEnrollment(
          courseIdStr,
          userId,
        );

        // Only enroll if not already enrolled
        if (!existingEnrollment) {
          await this.enrollmentsService.enroll(
            {
              courseId: courseIdStr,
              orderId: order._id.toString(),
            },
            userId,
          );
        }

        // Update course statistics
        await this.coursesService.incrementEnrollment(courseIdStr);
        await this.coursesService.addRevenue(courseIdStr, order.total);
      } catch (error) {
        // Log error but don't fail the entire process
        console.error(`Failed to enroll user in course ${courseIdStr}:`, error);
      }
    }
  }

  /**
   * Process authenticated checkout (professional approach)
   * - Creates order for authenticated user
   * - Supports test/mock payment mode for development
   * - Creates payment session or processes mock payment
   */
  async processCheckout(checkoutDto: any, userId: string) {
    const {
      cartItems,
      total,
      subtotal,
      paymentMethod,
      couponCode,
      billingAddress,
      useTestMode = false,
    } = checkoutDto;

    // Validate cart items
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty. Please add items to your cart before checkout.');
    }

    // Log cart items for debugging
    console.log('Processing checkout with cart items:', JSON.stringify(cartItems, null, 2));

    // Validate and apply coupon if provided
    let discount = 0;
    let finalSubtotal = subtotal;
    let finalTotal = total;
    let appliedCoupon: any = null;

    if (couponCode) {
      const couponValidation = await this.couponsService.validate(
        couponCode,
        subtotal,
      );

      if (!couponValidation.valid) {
        throw new BadRequestException('Invalid or expired coupon code');
      }

      discount = couponValidation.discount;
      appliedCoupon = couponValidation.coupon;
      finalSubtotal = subtotal;
      finalTotal = subtotal - discount;

      // Apply tax after discount (8%)
      const tax = finalTotal * 0.08;
      finalTotal = finalTotal + tax;
    }

    // Extract course/product IDs
    const courseIds = cartItems
      .filter((item: any) => item.courseId)
      .map((item: any) => item.courseId);

    const productIds = cartItems
      .filter((item: any) => item.productId)
      .map((item: any) => item.productId);

    // Create order
    const order = await this.ordersService.create({
      user: userId,
      courses: courseIds,
      subtotal: finalSubtotal,
      discount,
      total: finalTotal,
      paymentMethod,
      billingAddress: billingAddress
        ? {
          firstName: billingAddress.firstName || '',
          lastName: billingAddress.lastName || '',
          email: billingAddress.email || '',
          phone: billingAddress.phone || '',
          street: billingAddress.address || '',
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          country: billingAddress.country || '',
          zipCode: billingAddress.zipCode || '',
        }
        : undefined,
    } as any);

    // Apply coupon if used
    if (appliedCoupon) {
      await this.couponsService.applyCoupon(couponCode);
    }

    // Handle payment based on method and test mode
    let paymentResult;

    // Handle free orders (100% discount or $0 total)
    if (finalTotal <= 0) {
      console.log('🎁 Processing free order (100% discount)');
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      order.paymentIntentId = `free_${Date.now()}`;
      await order.save();

      // Create enrollments
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      await this.createInvoice(order);

      // Get user for email
      const user = await this.userModel.findById(userId);
      await this.sendPurchaseConfirmationEmail(user, order);

      return {
        success: true,
        paymentResult: {
          sessionId: order.paymentIntentId,
          url: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id=${order.paymentIntentId}`,
        },
        orderNumber: order.orderNumber,
        isFreeOrder: true,
      };
    }

    if (useTestMode) {
      // Mock payment - immediately mark as paid for development/testing
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      order.paymentIntentId = `test_${Date.now()}`;
      await order.save();

      // Create enrollments
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      await this.createInvoice(order);

      // Get user for email
      const user = await this.userModel.findById(userId);
      await this.sendPurchaseConfirmationEmail(user, order);

      return {
        success: true,
        paymentResult: {
          sessionId: order.paymentIntentId,
          url: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id=${order.paymentIntentId}`,
        },
        orderNumber: order.orderNumber,
        isTestMode: true,
      };
    } else if (paymentMethod === 'stripe') {
      // Real Stripe payment - fetch course/product names
      if (!cartItems || cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const lineItems = await Promise.all(
        cartItems.map(async (item: any, index: number) => {
          // Validate required fields
          if (!item.price || item.price <= 0) {
            throw new BadRequestException(`Invalid price for item at index ${index}`);
          }

          // Initialize with fallback values
          let name = 'Item';
          let description = '';

          // Try to get name from item first
          if (item.courseName && item.courseName.trim()) {
            name = item.courseName.trim();
          } else if (item.productName && item.productName.trim()) {
            name = item.productName.trim();
          }

          if (item.description) {
            description = item.description;
          }

          // Fetch course or product details if ID is provided
          if (item.courseId) {
            try {
              const course = await this.coursesService.findById(item.courseId);
              if (course?.title) {
                name = course.title.trim();
              }
              if (course?.excerpt || course?.description) {
                description = (course.excerpt || course.description || '').trim();
              }
            } catch (error) {
              console.error(`Failed to fetch course ${item.courseId}:`, error);
              // Use fallback: Course + ID
              if (!name || name === 'Item') {
                name = `Course ${item.courseId.substring(0, 8)}`;
              }
            }
          } else if (item.productId) {
            try {
              const product = await this.productsService.findById(item.productId);
              if (product?.title) {
                name = product.title.trim();
              }
              if (product?.description) {
                description = product.description.trim();
              }
            } catch (error) {
              console.error(`Failed to fetch product ${item.productId}:`, error);
              // Use fallback: Product + ID
              if (!name || name === 'Item') {
                name = `Product ${item.productId.substring(0, 8)}`;
              }
            }
          }

          // Final fallback - ensure name is never empty
          if (!name || name.trim() === '') {
            name = item.courseId ? `Course ${item.courseId.substring(0, 8)}`
              : item.productId ? `Product ${item.productId.substring(0, 8)}`
                : `Item ${index + 1}`;
          }

          // Final validation - this should never fail now
          const finalName = name.trim();
          if (!finalName || finalName.length === 0) {
            throw new BadRequestException(`Line item ${index} has empty name after all fallbacks`);
          }

          const lineItem = {
            price_data: {
              currency: 'usd',
              product_data: {
                name: finalName,
                description: (description || 'No description available').substring(0, 500), // Stripe limit
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity || 1,
          };

          // Log for debugging
          console.log(`Line item ${index}:`, JSON.stringify(lineItem, null, 2));

          return lineItem;
        })
      );

      // Validate line items before sending to Stripe
      if (!lineItems || lineItems.length === 0) {
        throw new BadRequestException('No valid line items to process');
      }

      // Final validation of all line items
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (!item.price_data?.product_data?.name || item.price_data.product_data.name.trim() === '') {
          console.error(`Invalid line item at index ${i}:`, JSON.stringify(item, null, 2));
          throw new BadRequestException(`Line item ${i} is missing required name field`);
        }
      }

      const orderId = (order as any)._id?.toString() || (order as any).id?.toString();
      paymentResult = await this.stripeService.createCheckoutSession({
        lineItems,
        successUrl: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.configService.get('FRONTEND_URL')}/checkout?canceled=true`,
        metadata: {
          orderId: orderId,
          userId: userId,
        },
      } as any);

      // Update order with session ID
      await this.orderModel.findByIdAndUpdate(order._id, {
        paymentIntentId: paymentResult.sessionId || paymentResult.id,
      });
    } else if (paymentMethod === 'paypal') {
      // Real PayPal payment
      const items = cartItems.map((item: any) => ({
        name: item.courseName || item.productName,
        quantity: item.quantity || 1,
        unit_amount: {
          currency_code: 'USD',
          value: item.price.toFixed(2),
        },
      }));

      paymentResult = await this.paypalService.createOrder(
        finalTotal,
        'USD',
        items,
      );

      await this.orderModel.findByIdAndUpdate(order._id, {
        paymentIntentId: paymentResult.orderId,
      });
    }

    return {
      success: true,
      paymentResult,
      orderNumber: order.orderNumber,
      isTestMode: false,
    };
  }

  /**
   * Process guest checkout
   * - Checks if user exists by email
   * - If not exists: creates guest user with random password and sends credentials
   * - If exists: uses existing user
   * - Creates order and payment session
   * - Sends purchase confirmation email
   */
  async processGuestCheckout(guestCheckoutDto: any) {
    const {
      email,
      firstName,
      lastName,
      phone,
      cartItems,
      total,
      subtotal,
      paymentMethod,
      couponCode,
    } = guestCheckoutDto;

    // Validate and apply coupon if provided
    let discount = 0;
    let finalSubtotal = subtotal;
    let finalTotal = total;
    let appliedCoupon: any = null;

    if (couponCode) {
      const couponValidation = await this.couponsService.validate(
        couponCode,
        subtotal,
      );

      if (!couponValidation.valid) {
        throw new BadRequestException('Invalid or expired coupon code');
      }

      discount = couponValidation.discount;
      appliedCoupon = couponValidation.coupon;
      finalSubtotal = subtotal;
      finalTotal = subtotal - discount;

      // Apply tax after discount (8%)
      const tax = finalTotal * 0.08;
      finalTotal = finalTotal + tax;
    }

    // Check if user exists
    let user = await this.userModel.findOne({ email });
    let isNewUser = false;
    let generatedPassword: string | null = null;

    if (!user) {
      // Generate random password for guest user
      generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Create guest user - email is verified since they provided it during checkout
      user = await this.userModel.create({
        email,
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        role: 'student',
        status: 'active',
        emailVerified: true, // Email verified since provided during checkout
      });
      isNewUser = true;
    }

    // Extract course/product IDs
    const courseIds = cartItems
      .filter((item: any) => item.courseId)
      .map((item: any) => item.courseId);

    const productIds = cartItems
      .filter((item: any) => item.productId)
      .map((item: any) => item.productId);

    // Create order
    const order = await this.ordersService.create({
      user: (user._id as any).toString(),
      courses: courseIds,
      subtotal: finalSubtotal,
      discount,
      total: finalTotal,
      paymentMethod,
    } as any);

    // Store generated password in order metadata for email sending
    if (generatedPassword) {
      await this.orderModel.findByIdAndUpdate(order._id, {
        $set: {
          'metadata.temporaryPassword': generatedPassword,
        },
      });
    }

    // Apply coupon if used
    if (appliedCoupon) {
      await this.couponsService.applyCoupon(couponCode);
    }

    // Handle free orders (100% discount or $0 total)
    if (finalTotal <= 0) {
      console.log('🎁 Processing free guest order (100% discount)');
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      order.paymentIntentId = `free_${Date.now()}`;
      await order.save();

      // Create enrollments
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      await this.createInvoice(order);

      // Send appropriate email based on whether user is new or existing
      if (isNewUser && generatedPassword) {
        await this.mailService.sendNewUserPurchaseEmail(
          user,
          order,
          generatedPassword,
        );
      } else {
        await this.sendPurchaseConfirmationEmail(user, order);
      }

      return {
        success: true,
        paymentResult: {
          sessionId: order.paymentIntentId,
          url: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id=${order.paymentIntentId}`,
        },
        orderNumber: order.orderNumber,
        isNewUser,
        userId: (user._id as any).toString(),
        isFreeOrder: true,
        discount,
        appliedCouponCode: appliedCoupon ? appliedCoupon.code : null,
      };
    }

    // Create payment session based on method
    let paymentResult;
    const metadata = {
      orderId: (order._id as any).toString(),
      userId: (user._id as any).toString(),
      email,
      isNewUser: isNewUser.toString(),
      temporaryPassword: generatedPassword || '',
    };

    if (paymentMethod === 'stripe') {
      // Fetch course/product names for Stripe line items
      const lineItems = await Promise.all(
        cartItems.map(async (item: any) => {
          let name = item.courseName || item.productName || 'Item';
          let description = item.description || '';

          // Fetch course or product details if ID is provided
          if (item.courseId) {
            try {
              const course = await this.coursesService.findById(item.courseId);
              name = course.title;
              description = course.excerpt || course.description || description;
            } catch (error) {
              console.error(`Failed to fetch course ${item.courseId}:`, error);
            }
          } else if (item.productId) {
            try {
              const product = await this.productsService.findById(item.productId);
              name = product.title;
              description = product.description || description;
            } catch (error) {
              console.error(`Failed to fetch product ${item.productId}:`, error);
            }
          }

          // Ensure name is never empty (Stripe requirement)
          if (!name || name.trim() === '') {
            name = item.courseId ? 'Course' : item.productId ? 'Product' : 'Item';
          }

          return {
            price_data: {
              currency: 'usd',
              product_data: {
                name: name.trim(),
                description: (description || '').substring(0, 500), // Stripe limit
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity || 1,
          };
        })
      );

      paymentResult = await this.stripeService.createCheckoutSession({
        lineItems,
        successUrl: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.configService.get('FRONTEND_URL')}/checkout?canceled=true`,
        metadata,
      } as any);

      // Update order with session ID
      await this.orderModel.findByIdAndUpdate(order._id, {
        paymentIntentId: paymentResult.sessionId,
      });
    } else if (paymentMethod === 'paypal') {
      const items = cartItems.map((item: any) => ({
        name: item.courseName || item.productName,
        quantity: item.quantity || 1,
        unit_amount: {
          currency_code: 'USD',
          value: item.price.toFixed(2),
        },
      }));

      paymentResult = await this.paypalService.createOrder(
        finalTotal,
        'USD',
        items,
      );

      await this.orderModel.findByIdAndUpdate(order._id, {
        paymentIntentId: paymentResult.orderId,
      });
    }

    return {
      success: true,
      paymentResult,
      orderNumber: order.orderNumber,
      isNewUser,
      userId: (user._id as any).toString(),
      discount,
      appliedCouponCode: appliedCoupon ? appliedCoupon.code : null,
      // Don't send password in response for security
    };
  }

  /**
   * Verify guest payment after successful checkout
   * Sends appropriate email based on whether user is new or existing
   */
  async verifyGuestPayment(sessionId: string, email: string) {
    // Retrieve payment session
    const session = await this.stripeService.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not completed');
    }

    // Find order by session ID
    const order = await this.orderModel
      .findOne({
        paymentIntentId: sessionId,
      })
      .populate('user courses products');

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update order status
    order.status = OrderStatus.COMPLETED;
    order.paidAt = new Date();
    await order.save();

    // Create invoice
    await this.createInvoice(order);

    // Get user details
    const user = await this.userModel.findById(order.user);

    // Check if this was a new user registration
    const isNewUser = session.metadata?.isNewUser === 'true';
    const temporaryPassword = session.metadata?.temporaryPassword || '';

    // Send appropriate email
    if (isNewUser && temporaryPassword) {
      // Send welcome email with credentials
      await this.sendWelcomeEmail(user, order, temporaryPassword);
    } else {
      // Send purchase confirmation email only
      await this.sendPurchaseConfirmationEmail(user, order);
    }

    // Create enrollments for purchased courses
    await this.createEnrollmentsForOrder(order);

    return {
      success: true,
      orderNumber: order.orderNumber,
      message: isNewUser
        ? 'Payment successful! Check your email for login credentials.'
        : 'Payment successful! Check your email for purchase confirmation.',
      isNewUser,
    };
  }

  private async sendWelcomeEmail(user: any, order: any, password: string) {
    try {
      // Get order with populated courses
      const orderWithCourses = await this.orderModel
        .findById(order._id)
        .populate('courses')
        .exec();

      const courses = orderWithCourses?.courses || [];
      const courseNames = courses
        .map((course: any) => course.title || course.name)
        .join(', ');

      const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;
      const resetPasswordUrl = `${this.configService.get('FRONTEND_URL')}/forgot-password`;

      // Use sendMail method with custom template
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Welcome to Personal Wings - Your Account is Ready!',
        template: 'welcome-with-credentials',
        context: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          password,
          loginUrl,
          resetPasswordUrl,
          orderNumber: order.orderNumber,
          courses: courseNames,
          total: order.total,
          supportEmail: this.configService.get(
            'SUPPORT_EMAIL',
            'support@personalwings.com',
          ),
        },
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw - email failure shouldn't break the flow
    }
  }

  private async sendPurchaseConfirmationEmail(user: any, order: any) {
    try {
      // Get order with populated courses
      const orderWithCourses = await this.orderModel
        .findById(order._id)
        .populate('courses')
        .exec();

      const courses = orderWithCourses?.courses || [];
      const courseNames = courses
        .map((course: any) => course.title || course.name)
        .join(', ');

      const dashboardUrl = `${this.configService.get('FRONTEND_URL')}/dashboard`;
      const invoiceUrl = order.invoiceUrl || '';

      // Use sendMail method with custom template
      await this.mailService.sendMail({
        to: user.email,
        subject: 'Purchase Confirmation - Personal Wings',
        template: 'purchase-confirmation',
        context: {
          name: `${user.firstName} ${user.lastName}`,
          orderNumber: order.orderNumber,
          courses: courseNames,
          subtotal: order.subtotal,
          discount: order.discount || 0,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paidAt: order.paidAt,
          dashboardUrl,
          invoiceUrl,
          supportEmail: this.configService.get(
            'SUPPORT_EMAIL',
            'support@personalwings.com',
          ),
        },
      });
    } catch (error) {
      console.error('Failed to send purchase confirmation email:', error);
      // Don't throw - email failure shouldn't break the flow
    }
  }
}
