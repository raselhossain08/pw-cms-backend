import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MinLength,
} from 'class-validator';
import { BotIntent } from '../entities/ai-bot.entity';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  message: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class CreateKnowledgeDto {
  @IsString()
  @MinLength(1)
  category: string;

  @IsString()
  @MinLength(1)
  question: string;

  @IsString()
  @MinLength(1)
  answer: string;

  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsEnum(BotIntent, { each: true })
  @IsOptional()
  relatedIntents?: BotIntent[];

  @IsObject()
  @IsOptional()
  responseData?: any;
}

export class RateBotDto {
  @IsString()
  sessionId: string;

  @IsString()
  rating: string; // '1' to '5'

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class EscalateToHumanDto {
  @IsString()
  sessionId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
