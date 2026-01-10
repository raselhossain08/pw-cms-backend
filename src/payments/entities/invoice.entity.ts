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
  PENDING = 'pending',
}

// Invoice entity for tracking payment invoices
@Schema({ timestamps: true })
export class Invoice extends Document {
  @ApiProperty({ example: 'INV-2024-001', description: 'Invoice number' })
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @ApiProperty({ type: String, description: 'Order ID' })
  @Prop({ type: Types.ObjectId, ref: 'Order', required: false })
  order?: Types.ObjectId | Order;

  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 2999.99, description: 'Invoice amount' })
  @Prop({ required: false })
  amount?: number;

  @ApiProperty({ example: 2999.99, description: 'Subtotal amount' })
  @Prop({ required: false })
  subtotal?: number;

  @ApiProperty({ example: 299.99, description: 'Tax amount' })
  @Prop({ default: 0 })
  tax?: number;

  @ApiProperty({ example: 299.99, description: 'Tax amount (alternative field)' })
  @Prop({ default: 0 })
  taxAmount?: number;

  @ApiProperty({ example: 10, description: 'Tax rate percentage' })
  @Prop({ default: 0 })
  taxRate?: number;

  @ApiProperty({ example: 100, description: 'Discount amount' })
  @Prop({ default: 0 })
  discount?: number;

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

  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Invoice date',
    required: false
  })
  @Prop({ required: false, default: Date.now })
  invoiceDate: Date;

  @ApiProperty({
    example: '2024-02-15T00:00:00.000Z',
    description: 'Due date',
    required: false
  })
  @Prop({ required: false })
  dueDate: Date;

  @ApiProperty({
    example: 'https://example.com/invoice.pdf',
    description: 'Invoice PDF URL',
  })
  @Prop()
  pdfUrl: string;

  @ApiProperty({ type: Object, description: 'Billing information' })
  @Prop({ type: Object, required: false })
  billingInfo?: {
    companyName?: string;
    name?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    taxId?: string;
  };

  @ApiProperty({ type: [Object], description: 'Invoice items' })
  @Prop({ type: [Object], required: false })
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  @ApiProperty({ type: [Object], description: 'Invoice line items (alternative)' })
  @Prop({ type: [Object], required: false })
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  @ApiProperty({ type: String, description: 'Course ID' })
  @Prop({ type: Types.ObjectId, ref: 'Course', required: false })
  course?: Types.ObjectId;

  @ApiProperty({
    example: 'Payment terms: Net 30',
    description: 'Notes',
    required: false,
  })
  @Prop()
  notes: string;

  @ApiProperty({
    example: '2024-01-20T00:00:00.000Z',
    description: 'Date when invoice was paid',
    required: false
  })
  @Prop()
  paidAt: Date;

  @ApiProperty({
    example: false,
    description: 'Whether reminder has been sent',
    required: false
  })
  @Prop()
  reminderSent: boolean;

  // Timestamps from schema
  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Date when invoice was created'
  })
  createdAt?: Date;

  @ApiProperty({
    example: '2024-01-15T00:00:00.000Z',
    description: 'Date when invoice was last updated'
  })
  updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Configure toJSON to handle dates properly
InvoiceSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    // Helper function to check if value is an empty object
    const isEmptyObject = (val: any) => {
      if (!val) return true;
      if (val instanceof Date) return false;
      if (typeof val !== 'object') return false;
      return Object.keys(val).length === 0;
    };

    // Handle date fields properly
    ['createdAt', 'updatedAt', 'invoiceDate', 'dueDate', 'paidAt'].forEach(field => {
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
InvoiceSchema.virtual('id').get(function (this: any) {
  return this._id?.toString();
});
