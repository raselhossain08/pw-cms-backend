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

  @ApiProperty({
    example: false,
    description: 'Whether course is free (overrides price if true)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiProperty({ example: 120, description: 'Duration in hours' })
  @IsNumber()
  @Min(1)
  @IsOptional()
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

  @ApiProperty({
    example: 'Complete ATP certification training for aspiring airline pilots',
    description: 'Short excerpt for previews',
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    example: ['Boeing 737', 'Airbus A320'],
    description: 'Aircraft types covered',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  aircraftTypes?: string[];

  @ApiProperty({
    example: true,
    description: 'Whether course is featured',
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether course provides certificate',
  })
  @IsBoolean()
  @IsOptional()
  providesCertificate?: boolean;

  @ApiProperty({
    example: 30,
    description: 'Money back guarantee in days',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  moneyBackGuarantee?: number;

  @ApiProperty({
    example: 'en',
    description: 'Primary language code',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Primary Instructor ID (MongoDB ObjectId)',
    required: false,
  })
  @IsString()
  @IsOptional()
  instructor?: string;


  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Multiple Instructors IDs (MongoDB ObjectIds)',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructors?: string[];
}


