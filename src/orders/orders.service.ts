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

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private coursesService: CoursesService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Calculate totals
    const courses = await this.coursesService.findByIds(createOrderDto.courses);
    const subtotal = courses.reduce((sum, course) => sum + course.price, 0);
    const tax = subtotal * 0.1; // 10% tax for example
    const total = subtotal + tax;

    const order = new this.orderModel({
      ...createOrderDto,
      subtotal,
      tax,
      total,
      courses: createOrderDto.courses.map((id) => new Types.ObjectId(id)),
      user: new Types.ObjectId(createOrderDto.user),
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

  async getOrderStats(): Promise<any> {
    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
      averageOrderValue,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }),
      this.orderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.orderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, average: { $avg: '$total' } } },
      ]),
    ]);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageOrderValue: averageOrderValue[0]?.average || 0,
      conversionRate:
        totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    };
  }

  async processRefund(
    orderId: string,
    refundData: {
      amount: number;
      reason: string;
      processedBy: string;
    },
  ): Promise<Order> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Only completed orders can be refunded');
    }

    if (refundData.amount > order.total) {
      throw new BadRequestException('Refund amount cannot exceed order total');
    }

    order.status = OrderStatus.REFUNDED;
    order.refund = {
      amount: refundData.amount,
      reason: refundData.reason,
      processedAt: new Date(),
      processedBy: new Types.ObjectId(refundData.processedBy),
    };

    return await order.save();
  }
}
