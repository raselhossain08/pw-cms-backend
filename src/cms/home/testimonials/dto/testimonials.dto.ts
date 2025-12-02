import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SeoMetaDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class TestimonialDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  company: string;

  @ApiProperty()
  @IsString()
  avatar: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty()
  @IsString()
  comment: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fallback?: string;
}

export class CreateTestimonialsDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  subtitle: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [TestimonialDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialDto)
  testimonials?: TestimonialDto[];

  @ApiProperty({ type: SeoMetaDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTestimonialsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [TestimonialDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialDto)
  testimonials?: TestimonialDto[];

  @ApiProperty({ type: SeoMetaDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
