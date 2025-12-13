import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ChatType {
    USER_TO_USER = 'user_to_user',
    USER_TO_SUPPORT = 'user_to_support',
    USER_TO_INSTRUCTOR = 'user_to_instructor',
    GROUP_CHAT = 'group_chat',
    AI_CHAT = 'ai_chat',
}

@Schema({ timestamps: true })
export class ChatLog extends Document {
    @Prop({ required: true, enum: ChatType, index: true })
    chatType: ChatType;

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    senderId: Types.ObjectId;

    @Prop({ required: true })
    senderName: string;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    receiverId?: Types.ObjectId;

    @Prop()
    receiverName?: string;

    @Prop({ required: true })
    conversationId: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: [String], default: [] })
    attachments: string[];

    @Prop({ default: false })
    isRead: boolean;

    @Prop()
    readAt?: Date;

    @Prop({ default: false })
    isDeleted: boolean;

    @Prop()
    deletedAt?: Date;

    @Prop({ default: false })
    isFlagged: boolean;

    @Prop()
    flagReason?: string;

    @Prop()
    ipAddress?: string;

    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const ChatLogSchema = SchemaFactory.createForClass(ChatLog);

// Indexes
ChatLogSchema.index({ chatType: 1, createdAt: -1 });
ChatLogSchema.index({ conversationId: 1, createdAt: -1 });
ChatLogSchema.index({ senderId: 1, createdAt: -1 });
ChatLogSchema.index({ receiverId: 1, createdAt: -1 });
ChatLogSchema.index({ createdAt: -1 });
ChatLogSchema.index({ isRead: 1, receiverId: 1 });
