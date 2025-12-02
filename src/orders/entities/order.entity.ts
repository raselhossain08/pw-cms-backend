import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
}

@Schema({ timestamps: true })
export class Order extends Document {
  @ApiProperty({ example: 'ORD-2024-001', description: 'Order number' })
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ type: [String], description: 'Course IDs' })
  @Prop([{ type: Types.ObjectId, ref: 'Course' }])
  courses: Types.ObjectId[] | Course[];

  @ApiProperty({ example: 2999.99, description: 'Subtotal amount' })
  @Prop({ required: true, default: 0 })
  subtotal: number;

  @ApiProperty({ example: 299.99, description: 'Tax amount' })
  @Prop({ default: 0 })
  tax: number;

  @ApiProperty({ example: 0, description: 'Discount amount' })
  @Prop({ default: 0 })
  discount: number;

  @ApiProperty({ example: 3299.98, description: 'Total amount' })
  @Prop({ required: true, default: 0 })
  total: number;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    description: 'Order status',
  })
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method',
  })
  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: 'pi_1ABC123def456',
    description: 'Payment intent ID',
    required: false,
  })
  @Prop()
  paymentIntentId: string;

  @ApiProperty({
    example: 'ch_1ABC123def456',
    description: 'Charge ID',
    required: false,
  })
  @Prop()
  chargeId: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Payment date',
    required: false,
  })
  @Prop()
  paidAt: Date;

  @ApiProperty({
    example: 'INV-2024-001',
    description: 'Invoice number',
    required: false,
  })
  @Prop()
  invoiceNumber: string;

  @ApiProperty({
    example: 'https://example.com/invoice.pdf',
    description: 'Invoice URL',
    required: false,
  })
  @Prop()
  invoiceUrl: string;

  @ApiProperty({ type: Object, description: 'Billing address' })
  @Prop({ type: Object })
  billingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @ApiProperty({ type: Object, description: 'Payment details' })
  @Prop({ type: Object })
  paymentDetails: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  };

  @Prop({ type: Object })
  refund: {
    amount: number;
    reason: string;
    processedAt: Date;
    processedBy: Types.ObjectId;
  };

  @ApiProperty({
    example: 'Customer requested refund',
    description: 'Cancellation reason',
    required: false,
  })
  @Prop()
  cancellationReason: string;

  @Prop({ default: 0 })
  affiliateCommission: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  affiliate: Types.ObjectId | User;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Pre-save hook to generate order number
OrderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const count = await (this.constructor as any).countDocuments();
    this.orderNumber = `ORD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});
