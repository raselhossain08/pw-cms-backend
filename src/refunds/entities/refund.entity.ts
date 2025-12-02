import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RefundReason {
  COURSE_QUALITY = 'course_quality',
  TECHNICAL_ISSUES = 'technical_issues',
  NOT_AS_DESCRIBED = 'not_as_described',
  DUPLICATE_PURCHASE = 'duplicate_purchase',
  ACCIDENTAL_PURCHASE = 'accidental_purchase',
  INSTRUCTOR_ISSUE = 'instructor_issue',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Refund extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: RefundReason, required: true })
  reason: RefundReason;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: RefundStatus, default: RefundStatus.PENDING })
  status: RefundStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt: Date;

  @Prop({ type: String })
  reviewNotes: string;

  @Prop({ type: String })
  rejectionReason: string;

  @Prop({ type: String })
  transactionId: string; // Payment gateway transaction ID

  @Prop({ type: String })
  refundTransactionId: string; // Refund transaction ID from payment gateway

  @Prop({ type: Date })
  processedAt: Date;

  @Prop({ type: Date })
  completedAt: Date;

  @Prop({ type: [String], default: [] })
  attachments: string[]; // URLs to supporting documents

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

// Indexes
RefundSchema.index({ orderId: 1 });
RefundSchema.index({ userId: 1, status: 1 });
RefundSchema.index({ status: 1, createdAt: -1 });
RefundSchema.index({ courseId: 1 });
