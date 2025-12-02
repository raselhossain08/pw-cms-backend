import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDate,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignType, CampaignStatus } from '../entities/campaign.entity';

export class CreateCampaignDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(CampaignType)
  type: CampaignType;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  targetAudience?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  utmSource?: string;

  @IsString()
  @IsOptional()
  utmMedium?: string;

  @IsString()
  @IsOptional()
  utmCampaign?: string;

  @IsString()
  @IsOptional()
  utmContent?: string;

  @IsString()
  @IsOptional()
  landingPage?: string;

  @IsObject()
  @IsOptional()
  customData?: Record<string, any>;
}
