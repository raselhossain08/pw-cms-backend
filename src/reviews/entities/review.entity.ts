import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReviewType {
  COURSE = 'course',
  PRODUCT = 'product',
}

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ReviewType, required: true })
  type: ReviewType;

  @Prop({ type: Types.ObjectId, refPath: 'type', required: true })
  itemId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  helpful: Types.ObjectId[];

  @Prop({ default: false })
  verified: boolean; // User purchased/enrolled

  @Prop({ type: Types.ObjectId, ref: 'User' })
  instructorReply?: Types.ObjectId;

  @Prop()
  replyText?: string;

  @Prop()
  repliedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ itemId: 1, type: 1 });
ReviewSchema.index({ user: 1, itemId: 1 }, { unique: true });
ReviewSchema.index({ rating: 1 });
