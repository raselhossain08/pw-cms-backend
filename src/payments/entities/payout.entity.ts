import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Payout extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  instructor: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop()
  notes: string;

  @Prop()
  periodStart: Date;

  @Prop()
  periodEnd: Date;

  @Prop()
  processedAt: Date;

  @Prop()
  failureReason: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);
