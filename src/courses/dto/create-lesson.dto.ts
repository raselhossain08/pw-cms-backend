import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    example: 'Introduction to Aviation Regulations',
    description: 'Lesson title',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Learn the basics of aviation regulations...',
    description: 'Lesson description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Detailed lesson content and instructions...',
    description: 'Lesson content',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ example: 1800, description: 'Lesson duration in seconds' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty({
    example: 1,
    description: 'Lesson order in course',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  order?: number;

  @ApiProperty({
    enum: ['video', 'text', 'quiz', 'assignment', 'download'],
    description: 'Lesson type',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ enum: ['draft', 'published'], required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({
    example: 'moduleId',
    description: 'Parent module ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  moduleId?: string;

  @ApiProperty({
    example: 'introduction-to-aviation-regulations',
    description: 'URL slug (auto-generated if not provided)',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Video URL',
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({
    example: 'https://example.com/thumbnail.jpg',
    description: 'Lesson thumbnail URL',
  })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({
    example: ['document1.pdf', 'slides.pptx'],
    description: 'Lesson materials',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[];

  @ApiProperty({ example: true, description: 'Whether lesson is free to preview' })
  @IsBoolean()
  @IsOptional()
  isFree?: boolean;

  @ApiProperty({ example: true, description: 'Whether lesson is published' })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiProperty({
    example: ['Understand basic regulations', 'Know compliance requirements'],
    description: 'Lesson objectives',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objectives?: string[];
}
