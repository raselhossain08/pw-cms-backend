import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class UserSession extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 'session_token_123', description: 'Session token' })
  @Prop({ required: true, unique: true })
  sessionToken: string;

  @ApiProperty({ example: 'refresh_token_123', description: 'Refresh token' })
  @Prop({ required: true, unique: true })
  refreshToken: string;

  @ApiProperty({
    enum: SessionStatus,
    example: SessionStatus.ACTIVE,
    description: 'Session status',
  })
  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @ApiProperty({ example: '127.0.0.1', description: 'IP address' })
  @Prop()
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent' })
  @Prop()
  userAgent: string;

  @ApiProperty({ example: 'Chrome', description: 'Browser' })
  @Prop()
  browser: string;

  @ApiProperty({ example: 'Windows', description: 'Operating system' })
  @Prop()
  os: string;

  @ApiProperty({ example: 'Desktop', description: 'Device type' })
  @Prop()
  deviceType: string;

  @ApiProperty({ example: 'New York, US', description: 'Location' })
  @Prop()
  location: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Last activity timestamp',
  })
  @Prop({ default: Date.now })
  lastActivity: Date;

  @ApiProperty({
    example: '2024-02-15T10:30:00.000Z',
    description: 'Expires at',
  })
  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt: Date;

  @ApiProperty({
    example: 'User logged out',
    description: 'Revocation reason',
    required: false,
  })
  @Prop()
  revocationReason: string;

  @ApiProperty({ type: Object, description: 'Session metadata' })
  @Prop({ type: Object })
  metadata: {
    isRememberMe: boolean;
    loginMethod: string;
    twoFactorVerified: boolean;
  };
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Index for automatic expiration
UserSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
