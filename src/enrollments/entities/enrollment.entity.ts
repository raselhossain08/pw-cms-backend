import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  DROPPED = 'dropped',
}

@Schema({ timestamps: true })
export class Enrollment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({
    type: String,
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ type: Map, of: Boolean, default: {} })
  completedLessons: Map<string, boolean>;

  @Prop({ type: Map, of: Number, default: {} })
  lessonProgress: Map<string, number>;

  @Prop({ type: Map, of: Date, default: {} })
  lastAccessedLessons: Map<string, Date>;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  order?: Types.ObjectId;

  @Prop({ default: 0 })
  totalTimeSpent: number; // in minutes

  @Prop()
  lastAccessedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Certificate' })
  certificate?: Types.ObjectId;

  @Prop({ default: 0 })
  quizzesPassed: number;

  @Prop({ default: 0 })
  assignmentsCompleted: number;

  @Prop({ type: [String], default: [] })
  notes: string[];

  // Purchase tracking fields
  @Prop()
  purchaseDate?: Date;

  @Prop({ enum: ['free', 'paid'], default: 'free' })
  accessType: string;

  @Prop({ default: 0 })
  amountPaid: number;

  @Prop({ enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' })
  paymentStatus: string;

  @Prop()
  paymentMethod?: string; // stripe, paypal, etc.

  @Prop()
  transactionId?: string;

  @Prop()
  refundedAt?: Date;

  @Prop()
  refundReason?: string;

  // Access control fields
  @Prop({ default: true })
  hasAccess: boolean;

  @Prop()
  accessRevokedAt?: Date;

  @Prop()
  accessRevokedReason?: string;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Indexes
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1 });
EnrollmentSchema.index({ progress: 1 });
EnrollmentSchema.index({ paymentStatus: 1 });
EnrollmentSchema.index({ purchaseDate: -1 });
EnrollmentSchema.index({ hasAccess: 1 });
