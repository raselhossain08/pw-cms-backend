import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Schema({ timestamps: true })
export class PasswordReset extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({ example: 'reset_token_123', description: 'Reset token' })
  @Prop({ required: true, unique: true })
  token: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'Expires at',
  })
  @Prop({ required: true })
  expiresAt: Date;

  @ApiProperty({ example: false, description: 'Whether token has been used' })
  @Prop({ default: false })
  isUsed: boolean;

  @Prop()
  usedAt: Date;

  @ApiProperty({
    example: '127.0.0.1',
    description: 'IP address that requested reset',
  })
  @Prop()
  requestedFromIp: string;

  @ApiProperty({
    example: 'Mozilla/5.0...',
    description: 'User agent that requested reset',
  })
  @Prop()
  requestedFromUserAgent: string;

  @ApiProperty({
    example: '127.0.0.1',
    description: 'IP address that completed reset',
    required: false,
  })
  @Prop()
  completedFromIp: string;

  @ApiProperty({
    example: 'Mozilla/5.0...',
    description: 'User agent that completed reset',
    required: false,
  })
  @Prop()
  completedFromUserAgent: string;
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset);

// Index for automatic expiration
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
