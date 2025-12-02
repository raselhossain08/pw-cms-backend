import {
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReviewType } from '../entities/review.entity';

export class CreateReviewDto {
  @ApiProperty({ enum: ReviewType, description: 'Type of review' })
  @IsEnum(ReviewType)
  type: ReviewType;

  @ApiProperty({ description: 'ID of the item being reviewed' })
  @IsMongoId()
  itemId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  comment: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
