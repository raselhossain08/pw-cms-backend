import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Schema({ timestamps: true })
export class Coupon extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: CouponType, required: true })
  type: CouponType;

  @Prop({ required: true })
  value: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: 0 })
  maxUses: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ default: 0 })
  minPurchaseAmount: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
