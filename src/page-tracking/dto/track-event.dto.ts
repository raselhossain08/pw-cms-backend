import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class TrackEventDto {
  @IsString()
  sessionId: string;

  @IsString()
  eventType: string;

  @IsString()
  eventCategory: string;

  @IsString()
  @IsOptional()
  eventLabel?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  element?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsNumber()
  @IsOptional()
  positionX?: number;

  @IsNumber()
  @IsOptional()
  positionY?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
