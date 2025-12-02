import { IsString, IsOptional, IsDateString } from 'class-validator';

export class PageAnalyticsQueryDto {
  @IsString()
  @IsOptional()
  page?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
