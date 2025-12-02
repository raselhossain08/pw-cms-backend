import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum SecurityEventType {
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  PROFILE_UPDATE = 'profile_update',
  LOGIN = 'login',
  LOGOUT = 'logout',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  DEVICE_AUTHORIZED = 'device_authorized',
  DEVICE_REVOKED = 'device_revoked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
}

@Schema({ timestamps: true })
export class SecurityLog extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({
    enum: SecurityEventType,
    example: SecurityEventType.LOGIN,
    description: 'Event type',
  })
  @Prop({ type: String, enum: SecurityEventType, required: true })
  eventType: SecurityEventType;

  @ApiProperty({
    example: 'User logged in successfully',
    description: 'Event description',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: '127.0.0.1', description: 'IP address' })
  @Prop()
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent' })
  @Prop()
  userAgent: string;

  @ApiProperty({ example: 'New York, US', description: 'Location' })
  @Prop()
  location: string;

  @ApiProperty({ example: 'Chrome', description: 'Browser' })
  @Prop()
  browser: string;

  @ApiProperty({ example: 'Windows', description: 'Operating system' })
  @Prop()
  os: string;

  @ApiProperty({ example: 'Desktop', description: 'Device type' })
  @Prop()
  deviceType: string;

  @ApiProperty({
    example: 'device_123',
    description: 'Device ID',
    required: false,
  })
  @Prop()
  deviceId: string;

  @ApiProperty({ type: Object, description: 'Event metadata' })
  @Prop({ type: Object })
  metadata: {
    oldEmail: string;
    newEmail: string;
    method: string;
    isSuspicious: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  };

  @ApiProperty({ example: false, description: 'Whether event was successful' })
  @Prop({ default: true })
  isSuccess: boolean;

  @ApiProperty({
    example: 'Invalid credentials',
    description: 'Failure reason',
    required: false,
  })
  @Prop()
  failureReason: string;
}

export const SecurityLogSchema = SchemaFactory.createForClass(SecurityLog);

// Index for frequent queries
SecurityLogSchema.index({ user: 1, createdAt: -1 });
SecurityLogSchema.index({ eventType: 1, createdAt: -1 });
