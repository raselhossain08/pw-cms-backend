import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Invoice extends Document {
  @ApiProperty({ example: 'INV-2024-001', description: 'Invoice number' })
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @ApiProperty({ type: String, description: 'Order ID' })
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId | Order;

  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 2999.99, description: 'Invoice amount' })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ example: 299.99, description: 'Tax amount' })
  @Prop({ default: 0 })
  tax: number;

  @ApiProperty({ example: 3299.98, description: 'Total amount' })
  @Prop({ required: true })
  total: number;

  @ApiProperty({
    enum: InvoiceStatus,
    example: InvoiceStatus.SENT,
    description: 'Invoice status',
  })
  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @ApiProperty({ example: '2024-01-15', description: 'Invoice date' })
  @Prop({ required: true })
  invoiceDate: Date;

  @ApiProperty({ example: '2024-02-15', description: 'Due date' })
  @Prop({ required: true })
  dueDate: Date;

  @ApiProperty({
    example: 'https://example.com/invoice.pdf',
    description: 'Invoice PDF URL',
  })
  @Prop()
  pdfUrl: string;

  @ApiProperty({ type: Object, description: 'Billing information' })
  @Prop({ type: Object, required: true })
  billingInfo: {
    companyName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    taxId: string;
  };

  @ApiProperty({ type: [Object], description: 'Invoice items' })
  @Prop({ type: [Object], required: true })
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  @ApiProperty({
    example: 'Payment terms: Net 30',
    description: 'Notes',
    required: false,
  })
  @Prop()
  notes: string;

  @Prop()
  paidAt: Date;

  @Prop()
  reminderSent: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
