import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class TrackEventDto {
  @IsString()
  campaignId: string;

  @IsString()
  eventType: string; // impression, click, conversion, lead

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  medium?: string;

  @IsString()
  @IsOptional()
  referrer?: string;

  @IsString()
  @IsOptional()
  deviceType?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
