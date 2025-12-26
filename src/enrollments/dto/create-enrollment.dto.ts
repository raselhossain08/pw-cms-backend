import { IsMongoId, IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '../entities/enrollment.entity';

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsMongoId()
  courseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  orderId?: string;
}

export class CreateEnrollmentAdminDto {
  @ApiProperty()
  @IsMongoId()
  studentId: string;

  @ApiProperty()
  @IsMongoId()
  courseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @ApiProperty({ enum: EnrollmentStatus, required: false })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
