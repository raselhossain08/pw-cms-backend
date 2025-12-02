import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Certificate extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, unique: true })
  certificateId: string;

  @Prop({ required: true })
  issuedAt: Date;

  @Prop()
  certificateUrl?: string;

  @Prop({ default: false })
  emailSent?: boolean;

  @Prop()
  emailSentAt?: Date;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
CertificateSchema.index({ student: 1, course: 1 }, { unique: true });

@Schema({ timestamps: true })
export class Discussion extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];

  @Prop({ default: 0 })
  replyCount: number;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: false })
  isSolved: boolean;
}

export const DiscussionSchema = SchemaFactory.createForClass(Discussion);

@Schema({ timestamps: true })
export class DiscussionReply extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Discussion', required: true })
  discussion: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes: Types.ObjectId[];

  @Prop({ default: false })
  isAnswer: boolean;
}

export const DiscussionReplySchema =
  SchemaFactory.createForClass(DiscussionReply);

@Schema({ timestamps: true })
export class Assignment extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ default: 100 })
  maxPoints: number;

  @Prop({ type: [String], default: [] })
  attachments: string[];
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

@Schema({ timestamps: true })
export class AssignmentSubmission extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true })
  assignment: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop()
  submittedAt: Date;

  @Prop()
  grade?: number;

  @Prop()
  feedback?: string;

  @Prop()
  gradedAt?: Date;
}

export const AssignmentSubmissionSchema =
  SchemaFactory.createForClass(AssignmentSubmission);
