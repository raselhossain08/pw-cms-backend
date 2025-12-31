import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ example: 'conv_123', description: 'Conversation ID' })
  @IsString()
  @IsOptional()
  conversation?: string;

  @ApiProperty({ example: 'Hello there!', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    enum: MessageType,
    example: MessageType.TEXT,
    description: 'Message type',
  })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({
    example: 'msg_123',
    description: 'Reply to message ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  replyTo?: string;

  @ApiProperty({
    example: 'file.pdf',
    description: 'File URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({
    example: 'image.jpg',
    description: 'Image URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({
    example: {
      enabled: true,
      provider: 'chatgpt',
      responseDelay: 1500,
      tone: 'friendly',
      autoRespondWhen: 'offline',
      confidenceThreshold: 0.7,
    },
    description: 'AI response configuration',
    required: false,
  })
  @IsOptional()
  aiConfig?: {
    enabled?: boolean;
    provider?: 'chatgpt' | 'gemini' | 'custom';
    responseDelay?: number;
    tone?: 'professional' | 'friendly' | 'casual' | 'formal';
    autoRespondWhen?: 'always' | 'offline' | 'busy' | 'afterHours';
    confidenceThreshold?: number;
  };

  @ApiProperty({
    example: { isAI: true, confidence: 0.95 },
    description: 'Message metadata',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
