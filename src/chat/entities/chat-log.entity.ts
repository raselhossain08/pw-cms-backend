import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatEventLogDocument = ChatEventLog & Document;

@Schema({ timestamps: true, collection: 'chat_event_logs' })
export class ChatEventLog {
  @Prop({ type: Types.ObjectId, required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  messageId: Types.ObjectId;

  @Prop({ required: true })
  senderId: string;

  @Prop({
    type: String,
    enum: ['user', 'agent', 'ai', 'system'],
    required: true,
  })
  senderType: string;

  @Prop({ required: true })
  content: string;

  @Prop({
    type: String,
    enum: [
      'text',
      'ai_response',
      'error',
      'conversation_start',
      'conversation_end',
      'typing_indicator',
      'status_update',
      'support_conversation_created',
    ],
    default: 'text',
  })
  messageType: string;

  @Prop({ type: Object })
  metadata?: {
    confidence?: number;
    intent?: string;
    provider?: string;
    userMessage?: string;
    errorType?: string;
    context?: any;
    channel?: string;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    messageCount?: number;
    quickReplies?: string[];
    suggestedActions?: string[];
    responseTime?: Date;
  };

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ChatEventLogSchema = SchemaFactory.createForClass(ChatEventLog);

// Index for faster querying
ChatEventLogSchema.index({ conversationId: 1, timestamp: 1 });
ChatEventLogSchema.index({ senderType: 1 });
ChatEventLogSchema.index({ messageType: 1 });
ChatEventLogSchema.index({ timestamp: 1 });
