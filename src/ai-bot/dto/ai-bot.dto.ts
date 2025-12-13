import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  MinLength,
  IsBoolean,
  IsArray,
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

// AI Agent DTOs
export class CreateAgentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  description: string;

  @IsString()
  @MinLength(1)
  agentType: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knowledgeBase?: string[];

  @IsEnum(['active', 'inactive', 'training'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'training';
}

export class UpdateAgentDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  agentType?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knowledgeBase?: string[];

  @IsEnum(['active', 'inactive', 'training'])
  @IsOptional()
  status?: 'active' | 'inactive' | 'training';

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ToggleAgentStatusDto {
  @IsEnum(['active', 'inactive', 'training'])
  status: 'active' | 'inactive' | 'training';
}
