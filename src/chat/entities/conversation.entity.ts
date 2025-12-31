import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @ApiProperty({ type: [String], description: 'Participant user IDs' })
  @Prop([{ type: MongooseSchema.Types.Mixed }])
  participants: (Types.ObjectId | string)[];

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

  @ApiProperty({ example: false, description: 'Archived status' })
  @Prop({ default: false })
  archived: boolean;

  @ApiProperty({
    type: [String],
    description: 'Users who archived this conversation',
  })
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  archivedBy: Types.ObjectId[];

  @ApiProperty({ example: false, description: 'Starred status' })
  @Prop({ default: false })
  starred: boolean;

  @ApiProperty({
    type: [String],
    description: 'Users who starred this conversation',
  })
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  starredBy: Types.ObjectId[];

  @Prop({ type: Object })
  metadata: {
    courseTitle: string;
    instructorName: string;
    studentName: string;
  };

  @ApiProperty({ example: false, description: 'Support conversation flag' })
  @Prop({ default: false })
  isSupport: boolean;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email for support conversations',
    required: false,
  })
  @Prop()
  userEmail: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User name for support conversations',
    required: false,
  })
  @Prop()
  userName: string;

  @ApiProperty({
    example: 'technical',
    description: 'Support category',
    required: false,
  })
  @Prop()
  supportCategory: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
