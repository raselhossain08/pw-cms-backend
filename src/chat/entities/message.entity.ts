import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @ApiProperty({ type: String, description: 'Conversation ID' })
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversation: Types.ObjectId | Conversation;

  @ApiProperty({ type: String, description: 'Sender user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId | User;

  @ApiProperty({ example: 'Hello there!', description: 'Message content' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Message type',
  })
  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @ApiProperty({
    example: ['user1', 'user2'],
    description: 'Read by user IDs',
    required: false,
  })
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  readBy: Types.ObjectId[] | User[];

  @ApiProperty({
    example: 'file.pdf',
    description: 'File URL for file messages',
    required: false,
  })
  @Prop()
  fileUrl: string;

  @ApiProperty({
    example: 'image.jpg',
    description: 'Image URL for image messages',
    required: false,
  })
  @Prop()
  imageUrl: string;

  @ApiProperty({ example: true, description: 'Message edited flag' })
  @Prop({ default: false })
  isEdited: boolean;

  @ApiProperty({
    example: 'message_123',
    description: 'Reply to message ID',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyTo: Types.ObjectId | Message;

  @Prop({ type: Object })
  metadata: {
    fileSize: number;
    fileName: string;
    mimeType: string;
  };
}

export const MessageSchema = SchemaFactory.createForClass(Message);
