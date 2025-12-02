import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TrainingContentDto {
  @ApiProperty()
  @IsString()
  text: string;
}

export class LearningPointDto {
  @ApiProperty()
  @IsString()
  text: string;
}

export class FAQDto {
  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsString()
  answer: string;
}

export class InstructorSocialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class InstructorDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty()
  @IsString()
  bio: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InstructorSocialDto)
  social?: InstructorSocialDto;
}

export class RelatedEventDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;
}

export class EventDto {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty()
  @IsString()
  time: string;

  @ApiProperty()
  @IsString()
  venue: string;

  @ApiProperty()
  @IsString()
  location: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ type: [TrainingContentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrainingContentDto)
  trainingContent?: TrainingContentDto[];

  @ApiPropertyOptional({ type: [LearningPointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPointDto)
  learningPoints?: LearningPointDto[];

  @ApiPropertyOptional({ type: [FAQDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FAQDto)
  faqs?: FAQDto[];

  @ApiPropertyOptional({ type: [InstructorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorDto)
  instructors?: InstructorDto[];

  @ApiPropertyOptional({ type: [RelatedEventDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedEventDto)
  relatedEvents?: RelatedEventDto[];
}

export class SeoMetaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;
}

export class CreateEventsDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  subtitle: string;

  @ApiProperty({ type: [EventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventDto)
  events: EventDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEventsDto extends PartialType(CreateEventsDto) {}
