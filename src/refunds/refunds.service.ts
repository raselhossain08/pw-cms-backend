import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Refund, RefundStatus } from './entities/refund.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ReviewRefundDto } from './dto/review-refund.dto';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class RefundsService {
  constructor(
    @InjectModel(Refund.name) private refundModel: Model<Refund>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  async createRefund(
    createRefundDto: CreateRefundDto,
    userId: string,
  ): Promise<Refund> {
    // Verify order exists and belongs to user
    const order = await this.orderModel
      .findById(createRefundDto.orderId)
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user.toString() !== userId) {
      throw new BadRequestException(
        'You can only request refunds for your own orders',
      );
    }

    // Check if refund already exists for this order
    const existingRefund = await this.refundModel
      .findOne({
        orderId: createRefundDto.orderId,
        status: {
          $in: [
            RefundStatus.PENDING,
            RefundStatus.APPROVED,
            RefundStatus.PROCESSING,
          ],
        },
      })
      .exec();

    if (existingRefund) {
      throw new BadRequestException(
        'A refund request already exists for this order',
      );
    }

    // Check refund eligibility (e.g., within 30 days)
    const orderDate = (order as any).createdAt;
    const daysSinceOrder = Math.floor(
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceOrder > 30) {
      throw new BadRequestException(
        'Refund requests must be made within 30 days of purchase',
      );
    }

    const refund = new this.refundModel({
      ...createRefundDto,
      userId,
      transactionId: order.paymentIntentId,
    });

    return refund.save();
  }

  async findAll(filters: any): Promise<any> {
    const { page = 1, limit = 20, status, userId } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (userId) query.userId = userId;

    const total = await this.refundModel.countDocuments(query).exec();
    const refunds = await this.refundModel
      .find(query)
      .populate('userId', 'firstName lastName email')
      .populate('orderId')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      refunds,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<Refund | null> {
    const refund = await this.refundModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('orderId')
      .populate('courseId', 'title')
      .populate('reviewedBy', 'firstName lastName')
      .exec();

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  async getUserRefunds(userId: string, page = 1, limit = 20): Promise<any> {
    return this.findAll({ page, limit, userId });
  }

  async reviewRefund(
    id: string,
    reviewRefundDto: ReviewRefundDto,
    adminId: string,
  ): Promise<Refund | null> {
    const refund = await this.refundModel.findById(id).exec();
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be reviewed');
    }

    refund.status = reviewRefundDto.status;
    refund.reviewedBy = adminId as any;
    refund.reviewedAt = new Date();
    if (reviewRefundDto.reviewNotes)
      refund.reviewNotes = reviewRefundDto.reviewNotes;
    if (reviewRefundDto.rejectionReason)
      refund.rejectionReason = reviewRefundDto.rejectionReason;

    if (reviewRefundDto.status === RefundStatus.APPROVED) {
      refund.status = RefundStatus.PROCESSING;
    }

    return refund.save();
  }

  async processRefund(id: string): Promise<Refund | null> {
    const refund = await this.refundModel.findById(id).exec();
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Refund must be in processing status');
    }

    // Here you would integrate with payment gateway to process refund
    // For example: Stripe, PayPal, etc.
    // const refundResult = await this.stripeService.refund(refund.transactionId, refund.amount);

    refund.status = RefundStatus.COMPLETED;
    refund.processedAt = new Date();
    refund.completedAt = new Date();
    // refund.refundTransactionId = refundResult.id;

    return refund.save();
  }

  async cancelRefund(id: string, userId: string): Promise<Refund | null> {
    const refund = await this.refundModel.findById(id).exec();
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.userId.toString() !== userId) {
      throw new BadRequestException(
        'You can only cancel your own refund requests',
      );
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Only pending refunds can be cancelled');
    }

    return this.refundModel.findByIdAndDelete(id).exec();
  }

  async getRefundStats(): Promise<any> {
    const [total, pending, approved, rejected, completed] = await Promise.all([
      this.refundModel.countDocuments().exec(),
      this.refundModel.countDocuments({ status: RefundStatus.PENDING }).exec(),
      this.refundModel.countDocuments({ status: RefundStatus.APPROVED }).exec(),
      this.refundModel.countDocuments({ status: RefundStatus.REJECTED }).exec(),
      this.refundModel
        .countDocuments({ status: RefundStatus.COMPLETED })
        .exec(),
    ]);

    const totalRefunded = await this.refundModel
      .aggregate([
        { $match: { status: RefundStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .exec();

    return {
      total,
      pending,
      approved,
      rejected,
      completed,
      totalRefundedAmount: totalRefunded[0]?.total || 0,
    };
  }
}
