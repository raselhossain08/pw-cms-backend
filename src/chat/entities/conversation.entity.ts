import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @ApiProperty({ type: [String], description: 'Participant user IDs' })
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  participants: Types.ObjectId[] | User[];

  @ApiProperty({
    example: 'Course Discussion',
    description: 'Conversation title',
    required: false,
  })
  @Prop()
  title: string;

  @ApiProperty({
    example: 'course_123',
    description: 'Related course ID',
    required: false,
  })
  @Prop()
  courseId: string;

  @ApiProperty({
    type: String,
    description: 'Last message ID',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage: Types.ObjectId;

  @ApiProperty({ example: false, description: 'Group conversation flag' })
  @Prop({ default: false })
  isGroup: boolean;

  @ApiProperty({ type: String, description: 'Created by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop({ default: 0 })
  unreadCount: number;

  @Prop({ type: Object })
  metadata: {
    courseTitle: string;
    instructorName: string;
    studentName: string;
  };
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
