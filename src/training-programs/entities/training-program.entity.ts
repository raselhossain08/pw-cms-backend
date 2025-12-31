import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ProgramStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ProgramLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Schema({
  collection: 'course_sequence',
})
export class CourseSequence {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true })
  order: number;

  @Prop({ type: [Types.ObjectId], ref: 'Course', default: [] })
  prerequisites: Types.ObjectId[];

  @Prop({ default: false })
  isOptional: boolean;

  @Prop()
  estimatedDuration?: number; // in hours
}

export const CourseSequenceSchema =
  SchemaFactory.createForClass(CourseSequence);

@Schema({
  collection: 'training_programs',
  timestamps: true,
})
export class TrainingProgram extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  thumbnail?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({
    type: [CourseSequenceSchema],
    default: [],
  })
  courseSequence: CourseSequence[];

  @Prop({ type: String, enum: ProgramStatus, default: ProgramStatus.DRAFT })
  status: ProgramStatus;

  @Prop({ type: String, enum: ProgramLevel, default: ProgramLevel.BEGINNER })
  level: ProgramLevel;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop()
  originalPrice?: number;

  @Prop()
  duration?: number; // Total duration in hours

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  learningObjectives: string[];

  @Prop({ type: [String], default: [] })
  requirements: string[];

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: 0 })
  enrollmentCount: number;

  @Prop({ default: 0 })
  completionCount: number;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop()
  certificateTemplateId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ default: false })
  isSelfPaced: boolean;
}

export const TrainingProgramSchema =
  SchemaFactory.createForClass(TrainingProgram);

// Add indexes
TrainingProgramSchema.index({ instructor: 1 });
TrainingProgramSchema.index({ status: 1 });
TrainingProgramSchema.index({ isActive: 1 });
