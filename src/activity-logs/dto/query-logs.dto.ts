import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LogLevel, LogCategory } from '../entities/activity-log.entity';
import { ErrorSeverity } from '../entities/error-log.entity';
import { AiModel } from '../entities/ai-log.entity';
import { ChatType } from '../entities/chat-log.entity';
import { SystemEventType, SystemStatus } from '../entities/system-log.entity';

export class QueryLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @IsOptional()
  @IsEnum(LogCategory)
  category?: LogCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class QueryErrorLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsEnum(ErrorSeverity)
  severity?: ErrorSeverity;

  @IsOptional()
  @IsString()
  errorType?: string;

  @IsOptional()
  @IsString()
  isResolved?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class QueryAiLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsEnum(AiModel)
  model?: AiModel;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minResponseTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxResponseTime?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class QueryChatLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsEnum(ChatType)
  chatType?: ChatType;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class QuerySystemLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @IsOptional()
  @IsEnum(SystemEventType)
  eventType?: SystemEventType;

  @IsOptional()
  @IsEnum(SystemStatus)
  status?: SystemStatus;

  @IsOptional()
  @IsString()
  requiresAction?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
