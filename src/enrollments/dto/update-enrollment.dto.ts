import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
  IsDate,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../entities/enrollment.entity';
import { Type } from 'class-transformer';

export class UpdateEnrollmentDto {
  @ApiProperty({
    enum: EnrollmentStatus,
    required: false,
    description: 'Enrollment status',
  })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: EnrollmentStatus;

  @ApiProperty({
    type: Number,
    required: false,
    minimum: 0,
    maximum: 100,
    description: 'Course progress percentage',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @ApiProperty({
    type: Boolean,
    required: false,
    description: 'Whether the student has access to the course',
  })
  @IsBoolean()
  @IsOptional()
  hasAccess?: boolean;

  @ApiProperty({
    type: Date,
    required: false,
    description: 'Course expiration date',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Reason for the update',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkUpdateStatusDto {
  @ApiProperty({
    type: [String],
    description: 'Array of enrollment IDs to update',
  })
  @IsString({ each: true })
  ids: string[];

  @ApiProperty({
    enum: EnrollmentStatus,
    description: 'New status for all enrollments',
  })
  @IsEnum(EnrollmentStatus)
  status: EnrollmentStatus;
}

export class ExtendAccessDto {
  @ApiProperty({
    type: Number,
    description: 'Number of days to extend access',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  days: number;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Reason for extending access',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SendMessageDto {
  @ApiProperty({
    type: String,
    description: 'Email subject',
  })
  @IsString()
  subject: string;

  @ApiProperty({
    type: String,
    description: 'Email message content',
  })
  @IsString()
  message: string;
}
