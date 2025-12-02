import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
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
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);

// Indexes
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ status: 1 });
EnrollmentSchema.index({ progress: 1 });
