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

  @Prop()
  processedAt: Date;

  @Prop()
  refundedAt: Date;

  @ApiProperty({
    example: 'Customer requested refund',
    description: 'Failure reason',
    required: false,
  })
  @Prop()
  failureReason: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
