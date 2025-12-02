import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  IsObject,
} from 'class-validator';
import {
  CourseLevel,
  CourseStatus,
  CourseType,
} from '../entities/course.entity';

export class CreateCourseDto {
  @ApiProperty({
    example: 'ATP Certification Course',
    description: 'Course title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Complete ATP certification training',
    description: 'Course description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'atp-certification-course', description: 'URL slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'Advanced training for airline transport pilots',
    description: 'Short excerpt',
  })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiProperty({
    enum: CourseLevel,
    example: CourseLevel.ADVANCED,
    description: 'Course difficulty level',
  })
  @IsEnum(CourseLevel)
  @IsNotEmpty()
  level: CourseLevel;

  @ApiProperty({
    enum: CourseType,
    example: CourseType.COMBINED,
    description: 'Course type',
  })
  @IsEnum(CourseType)
  @IsNotEmpty()
  type: CourseType;

  @ApiProperty({
    enum: CourseStatus,
    example: CourseStatus.DRAFT,
    description: 'Course status',
  })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @ApiProperty({ example: 2999.99, description: 'Course price' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    example: 3999.99,
    description: 'Original price for discounts',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  originalPrice?: number;

  @ApiProperty({ example: 40, description: 'Course duration in hours' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  duration: number;

  @ApiProperty({
    example: 'https://example.com/course-image.jpg',
    description: 'Course thumbnail',
    required: false,
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    example: ['ATP', 'FAA'],
    description: 'Required prerequisites',
    required: false,
  })
  @IsArray()
  @IsOptional()
  prerequisites?: string[];

  @ApiProperty({
    example: ['Commercial Pilot License'],
    description: 'What you will learn',
    required: false,
  })
  @IsArray()
  @IsOptional()
  learningObjectives?: string[];

  @ApiProperty({
    example: ['Certificate', 'License'],
    description: 'What you will get',
    required: false,
  })
  @IsArray()
  @IsOptional()
  outcomes?: string[];

  @ApiProperty({
    example: ['airline', 'certification'],
    description: 'Course categories',
    required: false,
  })
  @IsArray()
  @IsOptional()
  categories?: string[];

  @ApiProperty({
    example: ['Boeing 737', 'Airbus A320'],
    description: 'Aircraft types covered',
    required: false,
  })
  @IsArray()
  @IsOptional()
  aircraftTypes?: string[];

  @ApiProperty({
    example: true,
    description: 'Featured course flag',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({
    example: true,
    description: 'Certificate provided flag',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  providesCertificate?: boolean;

  @ApiProperty({
    example: 30,
    description: 'Money back guarantee days',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  moneyBackGuarantee?: number;

  @ApiProperty({
    example: 10,
    description: 'Maximum students for practical courses',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  maxStudents?: number;

  @ApiProperty({
    example: { faaApproved: true, simulatorHours: 20 },
    description: 'Course metadata',
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
