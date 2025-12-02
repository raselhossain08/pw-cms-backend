import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Schema({ timestamps: true })
export class EmailVerification extends Document {
  @ApiProperty({ type: String, description: 'User ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @ApiProperty({
    example: 'verification_token_123',
    description: 'Verification token',
  })
  @Prop({ required: true, unique: true })
  token: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email to verify' })
  @Prop({ required: true })
  email: string;

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

  @ApiProperty({ example: 'signup', description: 'Verification type' })
  @Prop({ default: 'signup' })
  type: string;
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification);

// Index for automatic expiration
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
