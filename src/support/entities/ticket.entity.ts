import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  COURSE_CONTENT = 'course_content',
  ACCOUNT = 'account',
  REFUND = 'refund',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: String, required: true })
  ticketNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: TicketCategory, required: true })
  category: TicketCategory;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  relatedCourse: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  relatedOrder: Types.ObjectId;

  @Prop({ type: Date })
  resolvedAt: Date;

  @Prop({ type: Date })
  closedAt: Date;

  @Prop({ type: Number })
  rating: number; // Customer satisfaction rating (1-5)

  @Prop({ type: String })
  feedback: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Indexes
TicketSchema.index({ ticketNumber: 1 }, { unique: true });
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ category: 1 });
TicketSchema.index({ assignedTo: 1 });

@Schema({ timestamps: true })
export class TicketReply extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Boolean, default: false })
  isStaffReply: boolean;

  @Prop({ type: Boolean, default: false })
  isInternal: boolean; // Internal notes not visible to customer
}

export const TicketReplySchema = SchemaFactory.createForClass(TicketReply);

// Indexes
TicketReplySchema.index({ ticketId: 1, createdAt: 1 });
TicketReplySchema.index({ userId: 1 });
