import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SubmissionStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

export interface QuizAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  pointsEarned?: number;
}

@Schema({ timestamps: true })
export class QuizSubmission extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quiz: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ type: Array, default: [] })
  answers: QuizAnswer[];

  @Prop({
    type: String,
    enum: SubmissionStatus,
    default: SubmissionStatus.IN_PROGRESS,
  })
  status: SubmissionStatus;

  @Prop()
  score?: number;

  @Prop()
  percentage?: number;

  @Prop()
  passed?: boolean;

  @Prop()
  startedAt: Date;

  @Prop()
  submittedAt?: Date;

  @Prop()
  gradedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  gradedBy?: Types.ObjectId;

  @Prop()
  timeSpent?: number; // Minutes

  @Prop({ default: 1 })
  attemptNumber: number;

  @Prop()
  feedback?: string;
}

export const QuizSubmissionSchema =
  SchemaFactory.createForClass(QuizSubmission);

// Indexes
QuizSubmissionSchema.index({ quiz: 1, student: 1 });
QuizSubmissionSchema.index({ student: 1, status: 1 });
