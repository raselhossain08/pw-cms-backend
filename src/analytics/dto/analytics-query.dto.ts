import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export class AnalyticsQueryDto {
  @ApiProperty({
    enum: AnalyticsPeriod,
    example: AnalyticsPeriod.MONTH,
    description: 'Time period',
  })
  @IsEnum(AnalyticsPeriod)
  @IsOptional()
  period?: AnalyticsPeriod;

  @ApiProperty({
    example: '2024-01-01',
    description: 'Start date for custom period',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    example: '2024-01-31',
    description: 'End date for custom period',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    example: 'course_view',
    description: 'Event type filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiProperty({
    example: 'course_123',
    description: 'Course ID filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiProperty({
    example: 'instructor_123',
    description: 'Instructor ID filter',
    required: false,
  })
  @IsString()
  @IsOptional()
  instructorId?: string;
}
