import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Wishlist extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
  courses: Types.ObjectId[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
WishlistSchema.index({ user: 1 }, { unique: true });

@Schema({ timestamps: true })
export class CartItem {
  @Prop({ type: Types.ObjectId, refPath: 'itemType', required: true })
  itemId: Types.ObjectId;

  @Prop({ type: String, enum: ['Course', 'Product'], required: true })
  itemType: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 1 })
  quantity: number;
}

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({ type: Types.ObjectId, ref: 'Coupon' })
  appliedCoupon?: Types.ObjectId;

  @Prop({ default: 0 })
  discount: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ user: 1 }, { unique: true });
