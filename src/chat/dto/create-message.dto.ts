import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @ApiProperty({ example: 'conv_123', description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  conversation: string;

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
}
