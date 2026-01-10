import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
}

@Schema({ timestamps: true })
export class Transaction extends Document {
  @ApiProperty({ example: 'txn_123', description: 'Transaction ID' })
  @Prop({ required: true, unique: true })
  transactionId: string;

  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 100.5, description: 'Transaction amount' })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiProperty({ example: 1.0, description: 'Exchange rate used' })
  @Prop()
  exchangeRate: number;

  @ApiProperty({ example: 100.5, description: 'Amount in base currency' })
  @Prop()
  baseAmount: number;

  @ApiProperty({ example: 'USD', description: 'Base currency' })
  @Prop()
  baseCurrency: string;

  @ApiProperty({
    enum: TransactionType,
    example: TransactionType.PAYMENT,
    description: 'Transaction type',
  })
  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.COMPLETED,
    description: 'Transaction status',
  })
  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @ApiProperty({ example: 'Course purchase', description: 'Description' })
  @Prop()
  description: string;

  @ApiProperty({ example: 'stripe', description: 'Payment gateway' })
  @Prop()
  gateway: string;

  @ApiProperty({ example: 'pi_123', description: 'Gateway transaction ID' })
  @Prop()
  gatewayTransactionId: string;

  @ApiProperty({ type: Object, description: 'Gateway response' })
  @Prop({ type: Object })
  gatewayResponse: any;

  @ApiProperty({
    example: 'ord_123',
    description: 'Related order ID',
    required: false,
  })
  @Prop()
  orderId: string;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when transaction was processed',
    required: false
  })
  @Prop()
  processedAt: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when transaction was refunded',
    required: false
  })
  @Prop()
  refundedAt: Date;

  @ApiProperty({
    example: 'Customer requested refund',
    description: 'Failure reason',
    required: false,
  })
  @Prop()
  failureReason: string;

  // Timestamps from schema
  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when transaction was created'
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Date when transaction was last updated'
  })
  updatedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Configure toJSON to handle dates properly
TransactionSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    // Helper function to check if value is an empty object
    const isEmptyObject = (val: any) => {
      if (!val) return true;
      if (val instanceof Date) return false;
      if (typeof val !== 'object') return false;
      return Object.keys(val).length === 0;
    };

    // Handle date fields properly
    ['createdAt', 'updatedAt', 'processedAt', 'refundedAt'].forEach(field => {
      if (ret[field]) {
        if (ret[field] instanceof Date) {
          ret[field] = ret[field].toISOString();
        } else if (isEmptyObject(ret[field])) {
          // Remove empty objects
          delete ret[field];
        } else if (typeof ret[field] === 'object' && ret[field].$date) {
          // Handle MongoDB date objects
          ret[field] = new Date(ret[field].$date).toISOString();
        }
      }
    });

    // Remove __v and _id (use id instead)
    delete ret.__v;
    if (ret._id) {
      ret.id = ret._id;
      delete ret._id;
    }

    return ret;
  },
  virtuals: true
});

// Add a virtual for id
TransactionSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});
