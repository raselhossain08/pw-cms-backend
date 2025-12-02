import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

// Conversation intents that the bot can recognize
export enum BotIntent {
  GREETING = 'greeting',
  COURSE_INQUIRY = 'course_inquiry',
  ENROLLMENT_HELP = 'enrollment_help',
  PAYMENT_ISSUE = 'payment_issue',
  TECHNICAL_SUPPORT = 'technical_support',
  REFUND_REQUEST = 'refund_request',
  CERTIFICATE_INQUIRY = 'certificate_inquiry',
  ACCOUNT_HELP = 'account_help',
  COMPLAINT = 'complaint',
  FEEDBACK = 'feedback',
  GENERAL_QUESTION = 'general_question',
  HUMAN_AGENT_REQUEST = 'human_agent_request',
  GOODBYE = 'goodbye',
}

// Bot response types
export enum ResponseType {
  TEXT = 'text',
  QUICK_REPLY = 'quick_reply',
  CARD = 'card',
  LIST = 'list',
  ACTION = 'action',
  FORM = 'form',
}

// Bot conversation status
export enum ConversationStatus {
  ACTIVE = 'active',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}

// Bot conversation entity
@Schema({ timestamps: true })
export class BotConversation extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  sessionId: string;

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Prop({
    type: [
      {
        role: String,
        content: String,
        intent: String,
        confidence: Number,
        timestamp: Date,
      },
    ],
    default: [],
  })
  messages: Array<{
    role: 'user' | 'bot' | 'system';
    content: string;
    intent?: BotIntent;
    confidence?: number;
    timestamp: Date;
  }>;

  @Prop({ type: Object, default: {} })
  context: Record<string, any>; // Store conversation context (user preferences, last topic, etc.)

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Ticket' })
  escalatedTicketId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedAgentId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, min: 1, max: 5 })
  satisfactionRating?: number;

  @Prop({ type: String })
  satisfactionFeedback?: string;

  @Prop({ type: Date })
  lastActiveAt: Date;

  @Prop({ type: Date })
  resolvedAt?: Date;

  @Prop({ type: Date })
  closedAt?: Date;
}

export const BotConversationSchema =
  SchemaFactory.createForClass(BotConversation);

// Create indexes
BotConversationSchema.index({ userId: 1, status: 1 });
BotConversationSchema.index({ sessionId: 1 }, { unique: true });
BotConversationSchema.index({ createdAt: -1 });

// Knowledge base for bot responses
@Schema({ timestamps: true })
export class KnowledgeBase extends Document {
  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: String, required: true })
  answer: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  relatedIntents: BotIntent[];

  @Prop({
    type: String,
    enum: Object.values(ResponseType),
    default: ResponseType.TEXT,
  })
  responseType: ResponseType;

  @Prop({ type: Object })
  responseData?: any; // Quick replies, cards, forms, etc.

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  usageCount: number;

  @Prop({ type: Number, default: 0 })
  helpfulCount: number;

  @Prop({ type: Number, default: 0 })
  notHelpfulCount: number;
}

export const KnowledgeBaseSchema = SchemaFactory.createForClass(KnowledgeBase);

// Create indexes for knowledge base
KnowledgeBaseSchema.index({ keywords: 1 });
KnowledgeBaseSchema.index({ category: 1, isActive: 1 });
KnowledgeBaseSchema.index({ relatedIntents: 1 });

// AI Bot analytics
@Schema({ timestamps: true })
export class BotAnalytics extends Document {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, default: 0 })
  totalConversations: number;

  @Prop({ type: Number, default: 0 })
  resolvedByBot: number;

  @Prop({ type: Number, default: 0 })
  escalatedToHuman: number;

  @Prop({ type: Number, default: 0 })
  averageResponseTime: number; // in seconds

  @Prop({ type: Number, default: 0 })
  averageResolutionTime: number; // in minutes

  @Prop({ type: Object, default: {} })
  intentDistribution: Record<BotIntent, number>;

  @Prop({ type: Number, default: 0 })
  averageSatisfaction: number;

  @Prop({ type: Object, default: {} })
  topQuestions: Record<string, number>;
}

export const BotAnalyticsSchema = SchemaFactory.createForClass(BotAnalytics);

BotAnalyticsSchema.index({ date: -1 });

// Bot action/task assignment
@Schema({ timestamps: true })
export class BotTask extends Document {
  @Prop({ type: String, required: true })
  taskType: string; // 'create_ticket', 'send_email', 'update_order', etc.

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'BotConversation' })
  conversationId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  userId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: Object, required: true })
  taskData: any;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Prop({
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedTo?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String })
  result?: string;

  @Prop({ type: String })
  errorMessage?: string;

  @Prop({ type: Date })
  scheduledFor?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const BotTaskSchema = SchemaFactory.createForClass(BotTask);

BotTaskSchema.index({ conversationId: 1 });
BotTaskSchema.index({ status: 1, createdAt: 1 });
BotTaskSchema.index({ assignedTo: 1, status: 1 });
BotTaskSchema.index({ priority: 1, status: 1 });
