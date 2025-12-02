import {
  IsString,
  IsMongoId,
  IsDate,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SessionType } from '../entities/live-session.entity';

export class CreateLiveSessionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsMongoId()
  courseId: string;

  @ApiProperty({ enum: SessionType })
  @IsEnum(SessionType)
  type: SessionType;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;

  @ApiProperty()
  @IsNumber()
  @Min(15)
  duration: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAttendees?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isRecorded?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowChat?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowQA?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sendReminders?: boolean;
}
