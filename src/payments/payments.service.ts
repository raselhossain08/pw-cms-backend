import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { StripeProvider } from '../integrations/providers/stripe.provider';
import { PayPalProvider } from '../integrations/providers/paypal.provider';
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

import { PaymentMethod as PaymentMethodEntity } from './entities/payment-method.entity';
import { CustomerProfile } from './entities/customer-profile.entity';
import { EncryptionUtil } from '../shared/utils/encryption.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PaymentMethodEntity.name)
    private paymentMethodModel: Model<PaymentMethodEntity>,
    @InjectModel(CustomerProfile.name)
    private customerProfileModel: Model<CustomerProfile>,
    private configService: ConfigService,
    private stripeService: StripeProvider,
    private paypalService: PayPalProvider,
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
    const {
      amount,
      currency,
      paymentMethod,
      courseIds,
      description,
      couponCode,
    } = createPaymentIntentDto;

    let discount = 0;
    let finalAmount = amount;
    let couponId: string | undefined;

    if (couponCode) {
      const validation = await this.couponsService.validate(couponCode, amount);
      if (!validation.valid) {
        throw new BadRequestException(
          validation.message || 'Invalid coupon code',
        );
      }
      discount = validation.discount;
      finalAmount = Math.max(0, amount - discount);
      couponId = validation.coupon?._id?.toString();
    }

    const order = await this.ordersService.create({
      user: userId,
      courses: courseIds || [],
      subtotal: amount,
      discount,
      total: finalAmount,
      paymentMethod,
      coupon: couponId,
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
      paymentIntentId:
        paymentResult.paymentIntentId ||
        paymentResult.id ||
        paymentResult.orderId,
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
        paymentResult.paymentIntentId ||
        paymentResult.id ||
        paymentResult.orderId,
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
            await this.paypalService.confirmPayment(paymentIntentId);
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

  async getPaymentMethods(userId: string) {
    const methods = await this.paymentMethodModel
      .find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 });
    // Decrypt sensitive data if needed, but for listing we mostly need last4/brand
    // We'll keep providerMethodId encrypted in response as it shouldn't be exposed
    return methods;
  }

  async addPaymentMethod(userId: string, paymentMethodId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // 1. Get or create customer profile
    let profile = await this.customerProfileModel.findOne({ user: userId });
    let stripeCustomerId = profile?.stripeCustomerId
      ? EncryptionUtil.decrypt(profile.stripeCustomerId)
      : null;

    if (!profile) {
      // Create Stripe customer
      const customer = await this.stripeService.createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );
      stripeCustomerId = customer.id;

      profile = new this.customerProfileModel({
        user: userId,
        stripeCustomerId: EncryptionUtil.encrypt(customer.id),
      });
      await profile.save();
    } else if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
      );
      stripeCustomerId = customer.id;
      profile.stripeCustomerId = EncryptionUtil.encrypt(customer.id);
      await profile.save();
    }

    // 2. Attach payment method to customer
    await this.stripeService.attachPaymentMethod(
      stripeCustomerId,
      paymentMethodId,
    );

    // 3. Get payment method details
    const pm: any =
      await this.stripeService.retrievePaymentMethod(paymentMethodId);

    const method = new this.paymentMethodModel({
      user: userId,
      provider: 'stripe',
      type: pm.type,
      providerMethodId: EncryptionUtil.encrypt(paymentMethodId),
      last4: pm.card?.last4 || '',
      brand: pm.card?.brand || '',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: false, // Logic to set default if first one?
    });

    // If it's the first method, make it default
    const count = await this.paymentMethodModel.countDocuments({
      user: userId,
    });
    if (count === 0) {
      method.isDefault = true;
    }

    return await method.save();
  }

  async deletePaymentMethod(userId: string, methodId: string) {
    const method = await this.paymentMethodModel.findOne({
      _id: methodId,
      user: userId,
    });
    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    // Detach from Stripe
    if (method.provider === 'stripe') {
      const providerMethodId = EncryptionUtil.decrypt(method.providerMethodId);
      await this.stripeService.detachPaymentMethod(providerMethodId);
    }

    await this.paymentMethodModel.findByIdAndDelete(methodId);
    return { success: true, message: 'Payment method deleted' };
  }

  async handleStripeWebhook(payload: any, signature: string) {
    const event = await this.stripeService.constructEvent(payload, signature);
    const type = event.type;

    this.logger.log(`[handleStripeWebhook] Received webhook event: ${type}`);

    switch (type) {
      case 'checkout.session.completed':
        // Handle Stripe Checkout Session completion
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

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
        this.logger.log(`[handleStripeWebhook] Unhandled event type: ${type}`);
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

  async downloadInvoice(
    invoiceId: string,
    userId: string,
  ): Promise<{ url: string }> {
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
        refundResult = await this.stripeService.createRefund(
          order.paymentIntentId,
        );
      } else if (order.paymentMethod === PaymentMethod.PAYPAL) {
        // Assuming PayPal refund is supported now
        // We need capture ID, but order.chargeId stores it
        if (!order.chargeId) {
          throw new BadRequestException('No charge ID found for PayPal refund');
        }
        refundResult = await this.paypalService.createRefund(order.chargeId);
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

  /**
   * Handle Stripe Checkout Session completed event
   * This is triggered automatically by Stripe webhook when checkout session is completed
   */
  private async handleCheckoutSessionCompleted(session: any) {
    this.logger.log(
      `[handleCheckoutSessionCompleted] Processing session: ${session.id}`,
    );

    // Find order by session ID
    let order = await this.orderModel
      .findOne({
        paymentIntentId: session.id,
      })
      .populate('user courses');

    // If not found, try using metadata orderId
    if (!order && session.metadata?.orderId) {
      this.logger.log(
        `[handleCheckoutSessionCompleted] Trying to find order by metadata orderId: ${session.metadata.orderId}`,
      );
      order = await this.orderModel
        .findById(session.metadata.orderId)
        .populate('user courses');

      if (order) {
        // Update order with session ID
        order.paymentIntentId = session.id;
        await order.save();
      }
    }

    if (!order) {
      this.logger.error(
        `[handleCheckoutSessionCompleted] Order not found for session: ${session.id}`,
      );
      return;
    }

    this.logger.log(
      `[handleCheckoutSessionCompleted] Found order: ${order.orderNumber}, status: ${order.status}`,
    );

    // Only process if not already completed
    if (order.status !== OrderStatus.COMPLETED) {
      if (session.payment_status === 'paid') {
        this.logger.log(
          `[handleCheckoutSessionCompleted] Marking order ${order.orderNumber} as COMPLETED`,
        );

        order.status = OrderStatus.COMPLETED;
        order.paidAt = new Date();
        await order.save();

        // Create transaction record
        try {
          const userId = order.user._id?.toString() || order.user.toString();
          await this.createTransaction({
            user: userId as any,
            amount: order.total,
            currency: 'USD',
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            description: `Course purchase - Order ${order.orderNumber}`,
            gateway: 'stripe',
            gatewayTransactionId: session.id,
            orderId: (order as any)._id.toString(),
            processedAt: new Date(),
          } as any);
        } catch (error) {
          this.logger.error(
            `[handleCheckoutSessionCompleted] Failed to create transaction:`,
            error?.stack || error,
          );
        }

        // Create enrollments for purchased courses
        this.logger.log(
          `[handleCheckoutSessionCompleted] Creating enrollments for order: ${order.orderNumber}`,
        );
        await this.createEnrollmentsForOrder(order);

        // Create invoice
        this.logger.log(
          `[handleCheckoutSessionCompleted] Creating invoice for order: ${order.orderNumber}`,
        );
        await this.createInvoice(order);

        // Send confirmation email
        const user = await this.userModel.findById(order.user);
        if (user) {
          this.logger.log(
            `[handleCheckoutSessionCompleted] Sending confirmation email to: ${user.email}`,
          );
          await this.sendPurchaseConfirmationEmail(user, order);
        }

        this.logger.log(
          `[handleCheckoutSessionCompleted] Successfully processed order: ${order.orderNumber}`,
        );
      } else {
        this.logger.warn(
          `[handleCheckoutSessionCompleted] Payment not completed. Status: ${session.payment_status}`,
        );
      }
    } else {
      this.logger.log(
        `[handleCheckoutSessionCompleted] Order ${order.orderNumber} already completed, skipping`,
      );
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    this.logger.log(
      `[handlePaymentSuccess] Processing payment intent: ${paymentIntent.id}`,
    );

    const order = await this.orderModel
      .findOne({
        paymentIntentId: paymentIntent.id,
      })
      .populate('user courses');

    if (order && order.status !== OrderStatus.COMPLETED) {
      this.logger.log(
        `[handlePaymentSuccess] Marking order ${order.orderNumber} as COMPLETED`,
      );

      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      await order.save();

      await this.updateTransaction(
        paymentIntent.id,
        TransactionStatus.COMPLETED,
        { gatewayResponse: paymentIntent },
      );

      // Create enrollments for purchased courses
      this.logger.log(
        `[handlePaymentSuccess] Creating enrollments for order: ${order.orderNumber}`,
      );
      await this.createEnrollmentsForOrder(order);

      // Create invoice
      this.logger.log(
        `[handlePaymentSuccess] Creating invoice for order: ${order.orderNumber}`,
      );
      await this.createInvoice(order);

      // Send confirmation email
      const user = await this.userModel.findById(order.user);
      if (user) {
        this.logger.log(
          `[handlePaymentSuccess] Sending confirmation email to: ${user.email}`,
        );
        await this.sendPurchaseConfirmationEmail(user, order);
      }

      this.logger.log(
        `[handlePaymentSuccess] Successfully processed order: ${order.orderNumber}`,
      );
    } else if (!order) {
      this.logger.error(
        `[handlePaymentSuccess] Order not found for payment intent: ${paymentIntent.id}`,
      );
    } else {
      this.logger.log(
        `[handlePaymentSuccess] Order ${order.orderNumber} already completed`,
      );
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

    let discount = 0;
    let finalTotal = subtotal;
    let couponId: string | undefined;

    if (couponCode) {
      const validation = await this.couponsService.validate(
        couponCode,
        subtotal,
      );
      if (!validation.valid) {
        throw new BadRequestException(
          validation.message || 'Invalid coupon code',
        );
      }
      discount = validation.discount;
      finalTotal = Math.max(0, subtotal - discount);
      couponId = validation.coupon?._id?.toString();
    }

    // Create order
    const order = await this.ordersService.create({
      user: userId,
      courses: courseIds,
      subtotal,
      discount,
      total: finalTotal,
      paymentMethod: PaymentMethod.STRIPE,
      coupon: couponId,
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
    const { amount, currency, items, couponCode } = data;

    let discount = 0;
    let finalAmount = amount;
    let couponId: string | undefined;

    if (couponCode) {
      const validation = await this.couponsService.validate(couponCode, amount);
      if (!validation.valid) {
        throw new BadRequestException(
          validation.message || 'Invalid coupon code',
        );
      }
      discount = validation.discount;
      finalAmount = Math.max(0, amount - discount);
      couponId = validation.coupon?._id?.toString();
    }

    const order = await this.ordersService.create({
      user: userId,
      courses: [],
      subtotal: amount,
      discount,
      total: finalAmount,
      paymentMethod: PaymentMethod.PAYPAL,
      coupon: couponId,
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

    const result = await this.paypalService.confirmPayment(orderId);

    if (result.success) {
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
    this.logger.log(
      `[verifyStripeSession] Verifying session: ${sessionId} for user: ${userId}`,
    );

    const session =
      await this.stripeService.retrieveCheckoutSession(sessionId);

    if (!session) {
      this.logger.error(`[verifyStripeSession] Session not found: ${sessionId}`);
      throw new NotFoundException('Payment session not found');
    }

    // First, try to find order by sessionId only to debug
    let order = await this.orderModel
      .findOne({
        paymentIntentId: sessionId,
      })
      .populate('user courses');

    if (!order) {
      // Order doesn't exist at all - check if update is still pending
      this.logger.error(
        `[verifyStripeSession] No order found with paymentIntentId: ${sessionId}`,
      );

      // Try to find by metadata orderId in the Stripe session
      const orderId = session.metadata?.orderId;
      if (orderId) {
        this.logger.log(
          `[verifyStripeSession] Trying to find order by ID from metadata: ${orderId}`,
        );
        order = await this.orderModel
          .findById(orderId)
          .populate('user courses');

        if (order) {
          this.logger.warn(
            `[verifyStripeSession] Found order ${order.orderNumber} but paymentIntentId not set yet. Current: ${order.paymentIntentId}`,
          );

          // Update the order with the correct sessionId
          order.paymentIntentId = sessionId;
          await order.save();

          this.logger.log(
            `[verifyStripeSession] Updated order ${order.orderNumber} with sessionId`,
          );
        } else {
          throw new NotFoundException(
            `Order not found. Session: ${sessionId}, Metadata orderId: ${orderId}`,
          );
        }
      } else {
        throw new NotFoundException(
          `Order not found for session: ${sessionId}. No metadata orderId available.`,
        );
      }
    }

    // Verify user matches
    const orderUserId = order.user._id?.toString() || order.user.toString();

    if (orderUserId !== userId) {
      this.logger.error(
        `[verifyStripeSession] User mismatch. Order user: ${orderUserId}, requesting user: ${userId}`,
      );
      throw new NotFoundException(
        'Order not found or you do not have permission to access this order',
      );
    }

    this.logger.log(
      `[verifyStripeSession] Order found: ${order.orderNumber}, status: ${order.status}, payment_status: ${session.payment_status}`,
    );

    // Log detailed order info
    this.logger.log(
      `[verifyStripeSession] Order details - ID: ${order._id}, Courses count: ${order.courses?.length || 0}, User: ${order.user?._id || order.user}`,
    );

    if (order.courses && order.courses.length > 0) {
      const courseInfo = order.courses.map((c: any) => ({
        id: c._id?.toString() || c.toString(),
        title: c.title || 'N/A',
      }));
      this.logger.log(
        `[verifyStripeSession] Courses in order: ${JSON.stringify(courseInfo)}`,
      );
    } else {
      this.logger.error(
        `[verifyStripeSession] ⚠️ WARNING: Order ${order.orderNumber} has NO courses!`,
      );
    }

    // Check if payment is successful
    if (session.payment_status === 'paid') {
      // Update order status if not already completed
      if (order.status !== OrderStatus.COMPLETED) {
        this.logger.log(
          `[verifyStripeSession] Updating order ${order.orderNumber} to COMPLETED`,
        );

        order.status = OrderStatus.COMPLETED;
        order.paidAt = new Date();
        await order.save();

        // Create transaction record
        this.logger.log(
          `[verifyStripeSession] Creating transaction record for order: ${order.orderNumber}`,
        );
        try {
          const transaction = await this.createTransaction({
            user: userId as any,
            amount: order.total,
            currency: 'USD',
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            description: `Course purchase - Order ${order.orderNumber}`,
            gateway: 'stripe',
            gatewayTransactionId: sessionId,
            orderId: (order as any)._id.toString(),
            processedAt: new Date(),
          } as any);
          this.logger.log(
            `[verifyStripeSession] Transaction created successfully: ${transaction.transactionId}`,
          );
        } catch (error) {
          this.logger.error(
            `[verifyStripeSession] Failed to create transaction:`,
            error?.stack || error,
          );
        }

        // Create invoice
        this.logger.log(
          `[verifyStripeSession] Creating invoice for order: ${order.orderNumber}`,
        );
        await this.createInvoice(order);

        // Create enrollments for purchased courses
        this.logger.log(
          `[verifyStripeSession] Creating enrollments for order: ${order.orderNumber}`,
        );
        await this.createEnrollmentsForOrder(order);

        // Send confirmation email
        const user = await this.userModel.findById(userId);
        if (user) {
          this.logger.log(
            `[verifyStripeSession] Sending purchase confirmation email to: ${user.email}`,
          );
          await this.sendPurchaseConfirmationEmail(user, order);
        }
      } else {
        this.logger.log(
          `[verifyStripeSession] Order ${order.orderNumber} already completed, skipping updates`,
        );
      }

      return {
        success: true,
        orderNumber: order.orderNumber,
        status: session.payment_status,
        amountTotal: (session.amount_total || 0) / 100,
        message: 'Payment verified successfully!',
      };
    } else {
      this.logger.warn(
        `[verifyStripeSession] Payment not completed. Status: ${session.payment_status}`,
      );
      return {
        success: false,
        orderNumber: order.orderNumber,
        status: session.payment_status,
        amountTotal: (session.amount_total || 0) / 100,
        message: 'Payment has not been completed yet.',
      };
    }
  }

  /**
   * Helper method to create enrollments for an order
   */
  private async createEnrollmentsForOrder(order: any) {
    const userId = order.user._id?.toString() || order.user.toString();

    this.logger.log(
      `[createEnrollmentsForOrder] Creating enrollments for order ${order.orderNumber}, userId: ${userId}, courses: ${order.courses.length}`,
    );

    for (const courseId of order.courses) {
      const courseIdStr = courseId._id?.toString() || courseId.toString();

      try {
        this.logger.log(
          `[createEnrollmentsForOrder] Processing course ${courseIdStr} for user ${userId}`,
        );

        // Check if user is already enrolled
        const existingEnrollment = await this.enrollmentsService.getEnrollment(
          courseIdStr,
          userId,
        );

        if (existingEnrollment) {
          this.logger.log(
            `[createEnrollmentsForOrder] User ${userId} already enrolled in course ${courseIdStr}`,
          );
        } else {
          this.logger.log(
            `[createEnrollmentsForOrder] Enrolling user ${userId} in course ${courseIdStr}`,
          );

          const enrollment = await this.enrollmentsService.enroll(
            {
              courseId: courseIdStr,
              orderId: order._id.toString(),
            },
            userId,
          );

          this.logger.log(
            `[createEnrollmentsForOrder] Successfully enrolled user ${userId} in course ${courseIdStr}. Enrollment ID: ${enrollment._id}`,
          );
        }

        // Update course statistics
        this.logger.log(
          `[createEnrollmentsForOrder] Updating course statistics for ${courseIdStr}`,
        );
        await this.coursesService.incrementEnrollment(courseIdStr);
        await this.coursesService.addRevenue(courseIdStr, order.total);
      } catch (error) {
        // Log error but don't fail the entire process
        this.logger.error(
          `[createEnrollmentsForOrder] Failed to enroll user ${userId} in course ${courseIdStr}:`,
          error?.stack || error,
        );
      }
    }

    this.logger.log(
      `[createEnrollmentsForOrder] Completed enrollment process for order ${order.orderNumber}`,
    );
  }

  /**
   * Process authenticated checkout (professional approach)
   * - Creates order for authenticated user
   * - Supports test/mock payment mode for development
   * - Creates payment session or processes mock payment
   */
  async processCheckout(checkoutDto: any, userId: string) {
    const {
      firstName,
      lastName,
      email,
      phone,
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
      throw new BadRequestException(
        'Cart is empty. Please add items to your cart before checkout.',
      );
    }

    // Log cart items for debugging
    console.log(
      'Processing checkout with cart items:',
      JSON.stringify(cartItems, null, 2),
    );

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
        throw new BadRequestException(
          couponValidation.message || 'Invalid or expired coupon code',
        );
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
      coupon: appliedCoupon ? appliedCoupon._id.toString() : undefined,
      billingAddress: billingAddress
        ? {
          firstName: billingAddress.firstName || firstName || '',
          lastName: billingAddress.lastName || lastName || '',
          email: billingAddress.email || email || '',
          phone: billingAddress.phone || phone || '',
          street: billingAddress.address || billingAddress.street || '',
          city: billingAddress.city || '',
          state: billingAddress.state || '',
          country: billingAddress.country || '',
          zipCode: billingAddress.zipCode || '',
        }
        : {
          firstName: firstName || '',
          lastName: lastName || '',
          email: email || '',
          phone: phone || '',
          street: '',
          city: '',
          state: '',
          country: '',
          zipCode: '',
        },
    } as any);

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
            throw new BadRequestException(
              `Invalid price for item at index ${index}`,
            );
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
                description = (
                  course.excerpt ||
                  course.description ||
                  ''
                ).trim();
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
              const product = await this.productsService.findById(
                item.productId,
              );
              if (product?.title) {
                name = product.title.trim();
              }
              if (product?.description) {
                description = product.description.trim();
              }
            } catch (error) {
              console.error(
                `Failed to fetch product ${item.productId}:`,
                error,
              );
              // Use fallback: Product + ID
              if (!name || name === 'Item') {
                name = `Product ${item.productId.substring(0, 8)}`;
              }
            }
          }

          // Final fallback - ensure name is never empty
          if (!name || name.trim() === '') {
            name = item.courseId
              ? `Course ${item.courseId.substring(0, 8)}`
              : item.productId
                ? `Product ${item.productId.substring(0, 8)}`
                : `Item ${index + 1}`;
          }

          // Final validation - this should never fail now
          const finalName = name.trim();
          if (!finalName || finalName.length === 0) {
            throw new BadRequestException(
              `Line item ${index} has empty name after all fallbacks`,
            );
          }

          const lineItem = {
            price_data: {
              currency: 'usd',
              product_data: {
                name: finalName,
                description: (
                  description || 'No description available'
                ).substring(0, 500), // Stripe limit
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity || 1,
          };

          // Log for debugging
          console.log(`Line item ${index}:`, JSON.stringify(lineItem, null, 2));

          return lineItem;
        }),
      );

      // Validate line items before sending to Stripe
      if (!lineItems || lineItems.length === 0) {
        throw new BadRequestException('No valid line items to process');
      }

      // Final validation of all line items
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (
          !item.price_data?.product_data?.name ||
          item.price_data.product_data.name.trim() === ''
        ) {
          console.error(
            `Invalid line item at index ${i}:`,
            JSON.stringify(item, null, 2),
          );
          throw new BadRequestException(
            `Line item ${i} is missing required name field`,
          );
        }
      }

      const orderId =
        (order as any)._id?.toString() || (order as any).id?.toString();

      this.logger.log(
        `[processCheckout] Creating Stripe session for order: ${order.orderNumber}`,
      );

      paymentResult = await this.stripeService.createCheckoutSession({
        lineItems,
        successUrl: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.configService.get('FRONTEND_URL')}/checkout?canceled=true`,
        metadata: {
          orderId: orderId,
          userId: userId,
        },
      } as any);

      const sessionId = paymentResult.sessionId || paymentResult.id;
      this.logger.log(
        `[processCheckout] Stripe session created: ${sessionId}`,
      );

      // Update order with session ID and wait for confirmation
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          order._id,
          {
            paymentIntentId: sessionId,
          },
          { new: true }, // Return the updated document
        )
        .populate('user courses'); // Populate to verify courses are present

      if (!updatedOrder) {
        this.logger.error(
          `[processCheckout] Failed to update order ${order._id} with session ID`,
        );
        throw new Error('Failed to update order with payment session');
      }

      this.logger.log(
        `[processCheckout] Order ${order.orderNumber} updated with sessionId: ${sessionId}. Courses: ${updatedOrder.courses?.length || 0}`,
      );

      // Log course details for debugging
      if (updatedOrder.courses && updatedOrder.courses.length > 0) {
        const courseIds = updatedOrder.courses.map((c: any) => c._id?.toString() || c.toString());
        this.logger.log(
          `[processCheckout] Order courses: ${courseIds.join(', ')}`,
        );
      } else {
        this.logger.error(
          `[processCheckout] ⚠️ WARNING: Order ${order.orderNumber} has NO courses after update!`,
        );
      }
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

      // Force URL into paymentResult if not present (although provider should now return it)
      if (!paymentResult.url && paymentResult.links) {
        const approveLink = paymentResult.links.find(
          (link: any) => link.rel === 'approve',
        );
        if (approveLink) {
          paymentResult.url = approveLink.href;
        }
      }

      const paypalOrderId = paymentResult.orderId;
      this.logger.log(
        `[processCheckout] PayPal order created: ${paypalOrderId}`,
      );

      // Update order with PayPal order ID and wait for confirmation
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        order._id,
        {
          paymentIntentId: paypalOrderId,
        },
        { new: true },
      );

      if (!updatedOrder) {
        this.logger.error(
          `[processCheckout] Failed to update order ${order._id} with PayPal order ID`,
        );
        throw new Error('Failed to update order with PayPal order ID');
      }

      this.logger.log(
        `[processCheckout] Order ${order.orderNumber} updated with PayPal orderId: ${paypalOrderId}`,
      );
    } else {
      throw new BadRequestException('Invalid payment method selected');
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
        throw new BadRequestException(
          couponValidation.message || 'Invalid or expired coupon code',
        );
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
      coupon: appliedCoupon ? appliedCoupon._id.toString() : undefined,
    } as any);

    // Store generated password in order metadata for email sending
    if (generatedPassword) {
      await this.orderModel.findByIdAndUpdate(order._id, {
        $set: {
          'metadata.temporaryPassword': generatedPassword,
        },
      });
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
        cartItems.map(async (item: any, index: number) => {
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
                description = (
                  course.excerpt ||
                  course.description ||
                  ''
                ).trim();
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
              const product = await this.productsService.findById(
                item.productId,
              );
              if (product?.title) {
                name = product.title.trim();
              }
              if (product?.description) {
                description = product.description.trim();
              }
            } catch (error) {
              console.error(
                `Failed to fetch product ${item.productId}:`,
                error,
              );
              // Use fallback: Product + ID
              if (!name || name === 'Item') {
                name = `Product ${item.productId.substring(0, 8)}`;
              }
            }
          }

          // Final fallback - ensure name is never empty
          if (!name || name.trim() === '') {
            name = item.courseId
              ? `Course ${item.courseId.substring(0, 8)}`
              : item.productId
                ? `Product ${item.productId.substring(0, 8)}`
                : `Item ${index + 1}`;
          }

          // Final validation - this should never fail now
          const finalName = name.trim();
          if (!finalName || finalName.length === 0) {
            throw new BadRequestException(
              `Line item ${index} has empty name after all fallbacks`,
            );
          }

          const lineItem = {
            price_data: {
              currency: 'usd',
              product_data: {
                name: finalName,
                description: (
                  description || 'No description available'
                ).substring(0, 500), // Stripe limit
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity || 1,
          };

          // Log for debugging
          console.log(`Line item ${index}:`, JSON.stringify(lineItem, null, 2));

          return lineItem;
        }),
      );

      // Validate line items before sending to Stripe
      if (!lineItems || lineItems.length === 0) {
        throw new BadRequestException('No valid line items to process');
      }

      // Final validation of all line items
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (
          !item.price_data?.product_data?.name ||
          item.price_data.product_data.name.trim() === ''
        ) {
          console.error(
            `Invalid line item at index ${i}:`,
            JSON.stringify(item, null, 2),
          );
          throw new BadRequestException(
            `Line item ${i} is missing required name field`,
          );
        }
      }

      this.logger.log(
        `[processGuestCheckout] Creating Stripe session for order: ${order.orderNumber}`,
      );

      paymentResult = await this.stripeService.createCheckoutSession({
        lineItems,
        successUrl: `${this.configService.get('FRONTEND_URL')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${this.configService.get('FRONTEND_URL')}/checkout?canceled=true`,
        metadata,
      } as any);

      const sessionId = paymentResult.id;
      this.logger.log(
        `[processGuestCheckout] Stripe session created: ${sessionId}`,
      );

      // Update order with session ID and wait for confirmation
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        order._id,
        {
          paymentIntentId: sessionId,
        },
        { new: true }, // Return the updated document
      );

      if (!updatedOrder) {
        this.logger.error(
          `[processGuestCheckout] Failed to update order ${order._id} with session ID`,
        );
        throw new Error('Failed to update order with payment session');
      }

      this.logger.log(
        `[processGuestCheckout] Order ${order.orderNumber} updated with sessionId: ${sessionId}`,
      );
    } else if (paymentMethod === 'paypal') {
      const items = cartItems.map((item: any) => ({
        name: item.courseName || item.productName || 'Item',
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

      // Force URL into paymentResult if not present
      if (!paymentResult.url && paymentResult.links) {
        const approveLink = paymentResult.links.find(
          (link: any) => link.rel === 'approve',
        );
        if (approveLink) {
          paymentResult.url = approveLink.href;
        }
      }

      const paypalOrderId = paymentResult.orderId;
      this.logger.log(
        `[processGuestCheckout] PayPal order created: ${paypalOrderId}`,
      );

      // Update order with PayPal order ID and wait for confirmation
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        order._id,
        {
          paymentIntentId: paypalOrderId,
        },
        { new: true },
      );

      if (!updatedOrder) {
        this.logger.error(
          `[processGuestCheckout] Failed to update order ${order._id} with PayPal order ID`,
        );
        throw new Error('Failed to update order with PayPal order ID');
      }

      this.logger.log(
        `[processGuestCheckout] Order ${order.orderNumber} updated with PayPal orderId: ${paypalOrderId}`,
      );
    } else {
      throw new BadRequestException('Invalid payment method selected');
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
    this.logger.log(
      `[verifyGuestPayment] Starting verification for sessionId: ${sessionId}, email: ${email}`,
    );

    // Validate session ID format
    if (!sessionId || sessionId.trim().length === 0) {
      this.logger.error(
        `[verifyGuestPayment] Invalid session ID: empty or null`,
      );
      throw new BadRequestException('Invalid session ID');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.logger.error(`[verifyGuestPayment] Invalid email format: ${email}`);
      throw new BadRequestException('Invalid email address');
    }

    // Find order by session ID (Stripe) or Payment Intent ID (PayPal)
    const order = await this.orderModel
      .findOne({
        paymentIntentId: sessionId,
      })
      .populate('user courses');

    if (!order) {
      this.logger.error(
        `[verifyGuestPayment] Order not found for sessionId: ${sessionId}`,
      );
      throw new NotFoundException(
        `Order not found for session ID: ${sessionId}. The payment session may have expired or is invalid.`,
      );
    }

    this.logger.log(
      `[verifyGuestPayment] Order found: ${order.orderNumber}, status: ${order.status}, paymentMethod: ${order.paymentMethod}`,
    );

    // Verify email matches order
    const orderUser = await this.userModel.findById(order.user);
    if (!orderUser || orderUser.email.toLowerCase() !== email.toLowerCase()) {
      this.logger.error(
        `[verifyGuestPayment] Email mismatch. Order email: ${orderUser?.email}, provided: ${email}`,
      );
      throw new BadRequestException('Email does not match the order');
    }

    // Check payment status based on provider
    let isPaid = false;
    let paymentMetadata: any = {};

    if (order.paymentMethod === 'paypal') {
      this.logger.log(
        `[verifyGuestPayment] Processing PayPal payment verification`,
      );
      try {
        // For PayPal, we need to capture the order if not already captured
        if (order.status === OrderStatus.COMPLETED) {
          isPaid = true;
          this.logger.log(
            `[verifyGuestPayment] PayPal order already completed`,
          );
        } else {
          const captureResult =
            await this.paypalService.confirmPayment(sessionId);
          isPaid = captureResult.success;
          paymentMetadata = captureResult.data;
          this.logger.log(
            `[verifyGuestPayment] PayPal capture result: ${captureResult.success}`,
          );
        }
      } catch (error) {
        // If already captured or other error, check status directly if possible
        // But for now, assume failure if capture fails and not already completed
        this.logger.error(
          `[verifyGuestPayment] PayPal verification failed:`,
          error,
        );
        if (order.status === OrderStatus.COMPLETED) {
          isPaid = true;
          this.logger.warn(
            `[verifyGuestPayment] PayPal capture failed but order already completed`,
          );
        }
      }
    } else {
      // Stripe
      this.logger.log(
        `[verifyGuestPayment] Processing Stripe payment verification`,
      );
      try {
        const session =
          await this.stripeService.retrieveCheckoutSession(sessionId);

        if (!session) {
          this.logger.error(
            `[verifyGuestPayment] Stripe session not found: ${sessionId}`,
          );
          throw new NotFoundException('Payment session not found');
        }

        this.logger.log(
          `[verifyGuestPayment] Stripe session status: ${session.payment_status}`,
        );

        if (session.payment_status === 'paid') {
          isPaid = true;
          paymentMetadata = session.metadata || {};
        } else {
          this.logger.warn(
            `[verifyGuestPayment] Stripe payment not completed. Status: ${session.payment_status}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[verifyGuestPayment] Stripe session retrieval failed:`,
          error,
        );
        throw new BadRequestException(
          `Failed to verify Stripe payment: ${error.message}`,
        );
      }
    }

    if (!isPaid) {
      this.logger.error(
        `[verifyGuestPayment] Payment not completed for order: ${order.orderNumber}`,
      );
      throw new BadRequestException(
        'Payment has not been completed. Please try again or contact support.',
      );
    }

    this.logger.log(`[verifyGuestPayment] Payment verified successfully`);

    // Update order status if not already completed
    if (order.status !== OrderStatus.COMPLETED) {
      this.logger.log(
        `[verifyGuestPayment] Updating order status to COMPLETED`,
      );
      order.status = OrderStatus.COMPLETED;
      order.paidAt = new Date();
      await order.save();

      // Create invoice
      this.logger.log(
        `[verifyGuestPayment] Creating invoice for order: ${order.orderNumber}`,
      );
      await this.createInvoice(order);

      // Create enrollments for purchased courses
      this.logger.log(
        `[verifyGuestPayment] Creating enrollments for order: ${order.orderNumber}`,
      );
      await this.createEnrollmentsForOrder(order);
    } else {
      this.logger.log(
        `[verifyGuestPayment] Order already completed, skipping status update`,
      );
    }

    // Get user details
    const user = await this.userModel.findById(order.user);

    if (!user) {
      this.logger.error(
        `[verifyGuestPayment] User not found for order: ${order.orderNumber}`,
      );
      throw new NotFoundException('User not found');
    }

    // Check if this was a new user registration (from metadata if available, or order context)
    // For Stripe, it's in session.metadata. For PayPal, we might not have it in capture response unless we stored it.
    // However, we can infer it if the user was created recently or check our own logic.
    // But verifyGuestPayment signature implies we might not have the original context easily.
    // We can rely on the fact that if we are here, and order is completed, we should send emails.
    // To support `isNewUser` flag correctly across providers, we should store it in the Order model or rely on the fact
    // that the frontend passes it? No, frontend shouldn't be trusted for that.
    // Let's rely on Stripe metadata for Stripe. For PayPal, we might miss it if not stored.
    // Fix: We should check if the user has a password set or if they are "new" by creation date?
    // Or we can rely on `paymentMetadata` if we passed it to PayPal custom_id or similar.
    // In createOrder, we didn't pass extensive metadata to PayPal.

    // Fallback: Check if we have paymentMetadata.isNewUser (Stripe)
    const isNewUser = paymentMetadata?.isNewUser === 'true';
    const temporaryPassword = paymentMetadata?.temporaryPassword || '';

    this.logger.log(
      `[verifyGuestPayment] User details - isNewUser: ${isNewUser}, hasPassword: ${!!temporaryPassword}`,
    );

    // Send appropriate email
    // Only send if we haven't sent it yet? Ideally we should track email sent status.
    // For now, send if order was just completed.

    if (isNewUser && temporaryPassword) {
      // Send welcome email with credentials
      this.logger.log(
        `[verifyGuestPayment] Sending welcome email with credentials to: ${user.email}`,
      );
      await this.sendWelcomeEmail(user, order, temporaryPassword);
    } else {
      // Send purchase confirmation email only
      this.logger.log(
        `[verifyGuestPayment] Sending purchase confirmation email to: ${user.email}`,
      );
      await this.sendPurchaseConfirmationEmail(user, order);
    }

    this.logger.log(
      `[verifyGuestPayment] Verification completed successfully for order: ${order.orderNumber}`,
    );

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
