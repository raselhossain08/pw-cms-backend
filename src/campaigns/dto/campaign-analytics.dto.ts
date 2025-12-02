import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum DateRange {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  CUSTOM = 'custom',
}

export class CampaignAnalyticsDto {
  @IsEnum(DateRange)
  @IsOptional()
  dateRange?: DateRange;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
