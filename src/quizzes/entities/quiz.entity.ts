import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_IN_BLANK = 'fill_in_blank',
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string | string[]; // Can be multiple for checkboxes
  points: number;
  explanation?: string;
  order: number;
}

@Schema({ timestamps: true })
export class Quiz extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lesson' })
  lesson?: Types.ObjectId;

  @Prop({ type: Array, default: [] })
  questions: QuizQuestion[];

  @Prop({ required: true })
  totalPoints: number;

  @Prop({ required: true, default: 70 })
  passingScore: number; // Percentage

  @Prop({ default: 60 })
  duration: number; // Minutes

  @Prop({ default: 0 })
  attemptsAllowed: number; // 0 = unlimited

  @Prop({ default: false })
  shuffleQuestions: boolean;

  @Prop({ default: false })
  showCorrectAnswers: boolean;

  @Prop({ default: true })
  allowReview: boolean;

  @Prop()
  availableFrom?: Date;

  @Prop()
  availableUntil?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

// Indexes
QuizSchema.index({ course: 1 });
QuizSchema.index({ instructor: 1 });
QuizSchema.index({ lesson: 1 });
