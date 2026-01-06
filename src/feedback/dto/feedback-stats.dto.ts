import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { FeedbackType } from '../feedback.entity';

export class FeedbackStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;
}
