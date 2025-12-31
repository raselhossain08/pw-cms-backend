import { IsEnum, IsOptional, IsString, IsNumber, Min, Max, IsEmail, IsBoolean, IsObject } from 'class-validator';
import { FeedbackType, FeedbackRating } from '../feedback.entity';

export class CreateFeedbackDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsString()
  message: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: FeedbackRating;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @IsOptional()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}