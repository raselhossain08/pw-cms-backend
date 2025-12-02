import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { CourseLevel, CourseType } from '../entities/course.entity';

export class CreateCourseDto {
  @ApiProperty({
    example: 'ATP Certification Course',
    description: 'Course title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'atp-certification-course',
    description: 'URL slug (auto-generated if not provided)',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    example: 'Comprehensive ATP certification training program',
    description: 'Course description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'Learn everything needed for ATP certification...',
    description: 'Detailed course content',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    enum: CourseLevel,
    example: CourseLevel.ADVANCED,
    description: 'Course difficulty level',
  })
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiProperty({
    enum: CourseType,
    example: CourseType.COMBINED,
    description: 'Type of course',
  })
  @IsEnum(CourseType)
  type: CourseType;

  @ApiProperty({ example: 1299.99, description: 'Course price in USD' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiProperty({
    example: 1599.99,
    description: 'Original price for discount display',
    required: false,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiProperty({ example: 120, description: 'Duration in hours' })
  @IsNumber()
  @Min(1)
  durationHours?: number;

  @ApiProperty({ example: 120, description: 'Duration in hours (alias)' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 50, description: 'Maximum students allowed' })
  @IsNumber()
  @Min(1)
  maxStudents: number;

  @ApiProperty({
    example: ['aviation', 'certification', 'atp'],
    description: 'Course tags',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: ['Web Development', 'Data Science'],
    description: 'Course categories',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @ApiProperty({
    example: 'https://example.com/course-image.jpg',
    description: 'Course thumbnail image URL',
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ example: true, description: 'Whether course is published' })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({
    example: ['Basic aviation knowledge', 'Math skills'],
    description: 'Course prerequisites',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisites?: string[];

  @ApiProperty({
    example: ['Obtain ATP license', 'Understand regulations'],
    description: 'Learning objectives',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learningObjectives?: string[];
}
