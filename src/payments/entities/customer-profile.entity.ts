import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

@Schema({ timestamps: true })
export class CustomerProfile extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 'cus_123456', description: 'Stripe Customer ID' })
  @Prop()
  stripeCustomerId: string;

  @ApiProperty({ example: 'PAYER_ID_123', description: 'PayPal Payer ID' })
  @Prop()
  paypalPayerId: string;

  @ApiProperty({ type: Object, description: 'Metadata' })
  @Prop({ type: Object })
  metadata: any;
}

export const CustomerProfileSchema =
  SchemaFactory.createForClass(CustomerProfile);
