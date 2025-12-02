import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty()
  @IsMongoId()
  courseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  orderId?: string;
}
