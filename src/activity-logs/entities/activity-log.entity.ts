import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum LogCategory {
  USER = 'user',
  SYSTEM = 'system',
  ADMIN = 'admin',
  AI = 'ai',
  CHAT = 'chat',
  PAYMENT = 'payment',
  COURSE = 'course',
  SECURITY = 'security',
}

@Schema({ timestamps: true })
export class ActivityLog extends Document {
  @Prop({ required: true, enum: LogLevel, index: true })
  level: LogLevel;

  @Prop({ required: true, enum: LogCategory, index: true })
  category: LogCategory;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  metadata: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  userName?: string;

  @Prop()
  userEmail?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  method?: string;

  @Prop({ type: Object })
  requestData?: Record<string, any>;

  @Prop({ type: Object })
  responseData?: Record<string, any>;

  @Prop()
  duration?: number; // in milliseconds

  @Prop()
  statusCode?: number;

  @Prop({ default: false })
  isResolved: boolean;

  @Prop()
  resolvedBy?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  notes?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// Indexes for fast queries
ActivityLogSchema.index({ level: 1, createdAt: -1 });
ActivityLogSchema.index({ category: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ level: 1, category: 1, createdAt: -1 });
