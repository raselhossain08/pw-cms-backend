import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';
import { LessonType, LessonStatus } from '../entities/lesson.entity';

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction to ATP', description: 'Lesson title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'lesson-introduction', description: 'Lesson slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'This lesson covers the basics...',
    description: 'Lesson description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: LessonType,
    example: LessonType.VIDEO,
    description: 'Lesson type',
  })
  @IsEnum(LessonType)
  @IsNotEmpty()
  type: LessonType;

  @ApiProperty({
    enum: LessonStatus,
    example: LessonStatus.DRAFT,
    description: 'Lesson status',
  })
  @IsEnum(LessonStatus)
  @IsOptional()
  status?: LessonStatus;

  @ApiProperty({ example: 1, description: 'Lesson order in course' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  order: number;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Video URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    example: 'Lesson content in markdown',
    description: 'Text content',
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    example: 1800,
    description: 'Duration in seconds',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({
    example: true,
    description: 'Free lesson flag',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiProperty({
    example: ['quiz1', 'quiz2'],
    description: 'Quiz questions',
    required: false,
  })
  @IsArray()
  @IsOptional()
  quizQuestions?: string[];

  @ApiProperty({
    example: ['file1.pdf', 'file2.zip'],
    description: 'Downloadable files',
    required: false,
  })
  @IsArray()
  @IsOptional()
  downloads?: string[];

  @ApiProperty({
    example: 85,
    description: 'Passing score for quizzes',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  passingScore?: number;
}
