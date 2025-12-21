import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Course } from './course.entity';
import { CourseModule } from '../../course-modules/entities/course-module.entity';

export enum LessonType {
  VIDEO = 'video',
  TEXT = 'text',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  DOWNLOAD = 'download',
}

export enum LessonStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Schema({ timestamps: true })
export class Lesson extends Document {
  @ApiProperty({ example: 'Introduction to ATP', description: 'Lesson title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ example: 'lesson-introduction', description: 'Lesson slug' })
  @Prop({ required: true })
  slug: string;

  @ApiProperty({
    example: 'This lesson covers the basics...',
    description: 'Lesson description',
  })
  @Prop()
  description: string;

  @ApiProperty({
    enum: LessonType,
    example: LessonType.VIDEO,
    description: 'Lesson type',
  })
  @Prop({ type: String, enum: LessonType, required: true })
  type: LessonType;

  @ApiProperty({
    enum: LessonStatus,
    example: LessonStatus.PUBLISHED,
    description: 'Lesson status',
  })
  @Prop({ type: String, enum: LessonStatus, default: LessonStatus.DRAFT })
  status: LessonStatus;

  @ApiProperty({ example: 1, description: 'Lesson order in course' })
  @Prop({ required: true })
  order: number;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Video URL',
    required: false,
  })
  @Prop()
  videoUrl: string;

  @ApiProperty({
    example: 'Lesson content in markdown',
    description: 'Text content',
    required: false,
  })
  @Prop()
  content: string;

  @ApiProperty({
    example: 1800,
    description: 'Duration in seconds',
    required: false,
  })
  @Prop({ default: 0 })
  duration: number;

  @ApiProperty({ example: true, description: 'Free lesson flag' })
  @Prop({ default: false })
  isFree: boolean;

  @ApiProperty({
    example: ['quiz1', 'quiz2'],
    description: 'Quiz questions',
    required: false,
  })
  @Prop([String])
  quizQuestions: string[];

  @ApiProperty({
    example: ['file1.pdf', 'file2.zip'],
    description: 'Downloadable files',
    required: false,
  })
  @Prop([String])
  downloads: string[];

  @ApiProperty({ type: String, description: 'Course ID' })
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId | Course;

  @ApiProperty({ type: String, description: 'Module ID', required: false })
  @Prop({ type: Types.ObjectId, ref: 'CourseModule' })
  module?: Types.ObjectId | CourseModule;

  @ApiProperty({
    example: 85,
    description: 'Passing score for quizzes',
    required: false,
  })
  @Prop({ default: 70 })
  passingScore: number;

  @Prop({ default: 0 })
  completionCount: number;

  @Prop({ default: 0 })
  averageScore: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

// Performance indexes for common queries
LessonSchema.index({ course: 1, order: 1 }); // For course lessons queries
LessonSchema.index({ module: 1, order: 1 }); // For module lessons queries
LessonSchema.index({ course: 1, status: 1 }); // For published lessons filter
LessonSchema.index({ course: 1, type: 1 }); // For lesson type filtering
LessonSchema.index({ slug: 1 }, { unique: true }); // For unique slug lookups
LessonSchema.index({ course: 1, module: 1, order: 1 }); // Composite index for module lessons
