import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

export enum NotificationType {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
  SMS = 'sms',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.EMAIL,
    description: 'Notification type',
  })
  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @ApiProperty({
    enum: NotificationStatus,
    example: NotificationStatus.PENDING,
    description: 'Notification status',
  })
  @Prop({
    type: String,
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ApiProperty({
    example: 'Welcome to Personal Wings!',
    description: 'Notification title',
  })
  @Prop({ required: true })
  title: string;

  @ApiProperty({
    example: 'Thank you for joining our platform...',
    description: 'Notification message',
  })
  @Prop({ required: true })
  message: string;

  @ApiProperty({
    example: 'welcome_email',
    description: 'Notification template',
  })
  @Prop()
  template: string;

  @ApiProperty({
    type: Object,
    description: 'Notification data',
    required: false,
  })
  @Prop({ type: Object })
  data: Record<string, any>;

  @ApiProperty({
    example: 'https://example.com/action',
    description: 'Action URL',
    required: false,
  })
  @Prop()
  actionUrl: string;

  @ApiProperty({
    example: 'View Course',
    description: 'Action text',
    required: false,
  })
  @Prop()
  actionText: string;

  @ApiProperty({
    example: 'info',
    description: 'Notification priority',
    required: false,
  })
  @Prop({ default: 'info' })
  priority: string;

  @ApiProperty({ example: true, description: 'Read status', required: false })
  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  sentAt: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  readAt: Date;

  @Prop()
  errorMessage: string;

  @Prop({ type: Object })
  metadata: {
    campaignId: string;
    segment: string;
    tags: string[];
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
