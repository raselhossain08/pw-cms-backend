import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  DROPPED = 'dropped',
  PAUSED = 'paused',
}

@Schema({
  collection: 'course_progress',
})
export class CourseProgress {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ default: 0 })
  progress: number; // 0-100

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  completedAt?: Date;

  @Prop()
  startedAt?: Date;
}

export const CourseProgressSchema =
  SchemaFactory.createForClass(CourseProgress);

@Schema({
  collection: 'program_enrollments',
  timestamps: true,
})
export class ProgramEnrollment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'TrainingProgram', required: true })
  program: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({
    type: String,
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @Prop({ required: true })
  enrolledAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  overallProgress: number; // 0-100

  @Prop({ type: [CourseProgressSchema], default: [] })
  courseProgress: CourseProgress[];

  @Prop()
  certificateId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  payment?: Types.ObjectId;

  @Prop()
  expiresAt?: Date;

  @Prop()
  lastAccessedAt?: Date;
}

export const ProgramEnrollmentSchema =
  SchemaFactory.createForClass(ProgramEnrollment);

// Add indexes
ProgramEnrollmentSchema.index({ program: 1, student: 1 }, { unique: true });
ProgramEnrollmentSchema.index({ student: 1 });
ProgramEnrollmentSchema.index({ status: 1 });
