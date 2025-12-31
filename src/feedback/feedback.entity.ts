import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackDocument = Feedback & Document;

export enum FeedbackType {
  CHAT = 'chat',
  GENERAL = 'general',
  FEATURE = 'feature',
  BUG = 'bug',
}

export enum FeedbackRating {
  VERY_POOR = 1,
  POOR = 2,
  AVERAGE = 3,
  GOOD = 4,
  EXCELLENT = 5,
}

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ required: true, enum: FeedbackType })
  type: FeedbackType;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: FeedbackRating })
  rating?: FeedbackRating;

  @Prop()
  email?: string;

  @Prop()
  name?: string;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  tags?: string[];

  @Prop({ default: false })
  followUpRequired: boolean;

  @Prop()
  followUpNotes?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);