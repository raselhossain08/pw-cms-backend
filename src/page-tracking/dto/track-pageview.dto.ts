import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class TrackPageViewDto {
  @IsString()
  page: string;

  @IsString()
  path: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsNumber()
  @IsOptional()
  timeOnPage?: number;

  @IsNumber()
  @IsOptional()
  scrollDepth?: number;

  @IsBoolean()
  @IsOptional()
  bounced?: boolean;

  @IsBoolean()
  @IsOptional()
  converted?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
