import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum AttemptStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

@Schema({ timestamps: true })
export class LoginAttempt extends Document {
  @ApiProperty({ type: String, description: 'User ID', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 'user@example.com', description: 'Email attempted' })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    enum: AttemptStatus,
    example: AttemptStatus.SUCCESS,
    description: 'Attempt status',
  })
  @Prop({ type: String, enum: AttemptStatus, required: true })
  status: AttemptStatus;

  @ApiProperty({ example: '127.0.0.1', description: 'IP address' })
  @Prop({ required: true })
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent' })
  @Prop()
  userAgent: string;

  @ApiProperty({
    example: 'Invalid password',
    description: 'Failure reason',
    required: false,
  })
  @Prop()
  failureReason: string;

  @ApiProperty({ example: 'New York, US', description: 'Location' })
  @Prop()
  location: string;

  @ApiProperty({ example: 'Chrome', description: 'Browser' })
  @Prop()
  browser: string;

  @ApiProperty({ example: 'Windows', description: 'Operating system' })
  @Prop()
  os: string;

  @ApiProperty({
    example: '2fa_required',
    description: 'Additional context',
    required: false,
  })
  @Prop()
  context: string;

  @ApiProperty({ type: Object, description: 'Additional metadata' })
  @Prop({ type: Object })
  metadata: {
    isSuspicious: boolean;
    countryCode: string;
    timezone: string;
  };
}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);

// Index for frequent queries
LoginAttemptSchema.index({ email: 1, createdAt: -1 });
LoginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
