import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ReportType {
  OVERVIEW = 'Overview',
  SALES = 'Sales',
  ENGAGEMENT = 'Engagement',
  TRAFFIC = 'Traffic',
  CUSTOM = 'Custom',
}

export enum ReportStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  GENERATED = 'generated',
  FAILED = 'failed',
}

export class ReportConfigDto {
  @ApiProperty({ description: 'Report metrics to include' })
  @IsArray()
  @IsOptional()
  metrics?: string[];

  @ApiProperty({ description: 'Report filters' })
  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;

  @ApiProperty({ description: 'Chart configuration' })
  @IsObject()
  @IsOptional()
  chartConfig?: Record<string, any>;
}

export class CreateReportDto {
  @ApiProperty({ description: 'Report name', example: 'Monthly Sales Report' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Report description',
    example: 'Detailed sales analysis for the month',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Report type',
    enum: ReportType,
    example: ReportType.SALES,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({
    description: 'Report period',
    example: 'Nov 2025',
  })
  @IsString()
  @IsNotEmpty()
  period: string;

  @ApiProperty({
    description: 'Report status',
    enum: ReportStatus,
    example: ReportStatus.SCHEDULED,
    required: false,
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  status?: ReportStatus;

  @ApiProperty({
    description: 'Report configuration',
    type: ReportConfigDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => ReportConfigDto)
  @IsOptional()
  config?: ReportConfigDto;

  @ApiProperty({
    description: 'Auto-generate report',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  autoGenerate?: boolean;

  @ApiProperty({
    description: 'Schedule date (ISO 8601)',
    example: '2025-12-15T10:00:00Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  scheduledAt?: string;
}
