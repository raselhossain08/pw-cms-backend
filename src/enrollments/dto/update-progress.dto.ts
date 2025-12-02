import {
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProgressDto {
  @ApiProperty()
  @IsMongoId()
  lessonId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  timeSpent?: number; // in seconds
}
