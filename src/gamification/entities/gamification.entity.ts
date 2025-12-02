import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PointActivityType {
  COURSE_COMPLETED = 'course_completed',
  LESSON_COMPLETED = 'lesson_completed',
  QUIZ_PASSED = 'quiz_passed',
  ASSIGNMENT_SUBMITTED = 'assignment_submitted',
  PERFECT_SCORE = 'perfect_score',
  DAILY_LOGIN = 'daily_login',
  COURSE_REVIEWED = 'course_reviewed',
  DISCUSSION_POST = 'discussion_post',
  HELP_OTHERS = 'help_others',
  STREAK_MILESTONE = 'streak_milestone',
}

@Schema({ timestamps: true })
export class UserPoints extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop()
  lastActivityDate?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Badge' }], default: [] })
  badges: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Achievement' }], default: [] })
  achievements: Types.ObjectId[];

  @Prop({ default: 0 })
  coursesCompleted: number;

  @Prop({ default: 0 })
  quizzesPassed: number;

  @Prop({ default: 0 })
  assignmentsCompleted: number;
}

export const UserPointsSchema = SchemaFactory.createForClass(UserPoints);

@Schema({ timestamps: true })
export class PointTransaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: PointActivityType, required: true })
  activityType: PointActivityType;

  @Prop({ required: true })
  points: number;

  @Prop()
  description: string;

  @Prop({ type: Types.ObjectId, refPath: 'referenceModel' })
  reference?: Types.ObjectId;

  @Prop({ type: String })
  referenceModel?: string;
}

export const PointTransactionSchema =
  SchemaFactory.createForClass(PointTransaction);

@Schema({ timestamps: true })
export class Badge extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  criteria: string;

  @Prop({ default: 0 })
  pointsRequired: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BadgeSchema = SchemaFactory.createForClass(Badge);

@Schema({ timestamps: true })
export class Achievement extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ type: String, enum: PointActivityType })
  activityType: PointActivityType;

  @Prop({ default: 1 })
  targetCount: number;

  @Prop({ default: 0 })
  rewardPoints: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

// Indexes
UserPointsSchema.index({ totalPoints: -1 });
UserPointsSchema.index({ level: -1 });
PointTransactionSchema.index({ user: 1, createdAt: -1 });
