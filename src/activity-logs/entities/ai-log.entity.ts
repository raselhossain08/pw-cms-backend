import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AiModel {
  GPT4 = 'gpt-4',
  GPT35 = 'gpt-3.5-turbo',
  CLAUDE = 'claude-3',
  GEMINI = 'gemini-pro',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class AiLog extends Document {
  @Prop({ required: true, enum: AiModel, index: true })
  aiModel: AiModel;
  @Prop({ required: true })
  prompt: string;

  @Prop({ required: true })
  response: string;

  @Prop({ required: true })
  tokensUsed: number;

  @Prop({ required: true })
  responseTime: number; // milliseconds

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop()
  userName?: string;

  @Prop()
  conversationId?: string;

  @Prop()
  intentType?: string; // e.g., 'course_recommendation', 'question_answer', 'support'

  @Prop({ default: false })
  wasHelpful?: boolean;

  @Prop()
  userFeedback?: string;

  @Prop()
  cost?: number; // cost in cents

  @Prop({ default: 'success' })
  status: string; // success, error, timeout

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const AiLogSchema = SchemaFactory.createForClass(AiLog);

// Indexes
AiLogSchema.index({ model: 1, createdAt: -1 });
AiLogSchema.index({ userId: 1, createdAt: -1 });
AiLogSchema.index({ conversationId: 1 });
AiLogSchema.index({ createdAt: -1 });
AiLogSchema.index({ status: 1, createdAt: -1 });
