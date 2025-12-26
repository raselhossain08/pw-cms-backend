import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

@Schema({ timestamps: true })
export class PaymentMethod extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 'stripe', description: 'Provider name' })
  @Prop({ required: true })
  provider: string;

  @ApiProperty({ example: 'card', description: 'Type of payment method' })
  @Prop({ required: true })
  type: string;

  @ApiProperty({
    example: 'pm_123456',
    description: 'Provider Payment Method ID',
  })
  @Prop({ required: true })
  providerMethodId: string;

  @ApiProperty({ example: 'Visa', description: 'Card brand' })
  @Prop()
  brand: string;

  @ApiProperty({ example: '4242', description: 'Last 4 digits' })
  @Prop()
  last4: string;

  @ApiProperty({ example: 12, description: 'Expiry month' })
  @Prop()
  expMonth: number;

  @ApiProperty({ example: 2025, description: 'Expiry year' })
  @Prop()
  expYear: number;

  @ApiProperty({ example: true, description: 'Is default payment method' })
  @Prop({ default: false })
  isDefault: boolean;

  @ApiProperty({ type: Object, description: 'Additional metadata' })
  @Prop({ type: Object })
  metadata: any;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);
