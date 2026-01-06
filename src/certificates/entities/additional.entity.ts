import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CourseModule } from '../../course-modules/entities/course-module.entity';
import { Lesson } from '../../courses/entities/lesson.entity';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Certificate extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  student: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ required: true, unique: true })
  certificateId: string;

  @Prop({ type: Date, default: () => new Date() })
  issuedAt: Date;

  @Prop()
  certificateUrl?: string;

  @Prop({ default: false })
  emailSent?: boolean;

  @Prop()
  emailSentAt?: Date;

  @Prop({ default: false })
  isRevoked?: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  revokedBy?: Types.ObjectId;

  @Prop()
  revocationReason?: string;

  @Prop()
  expiryDate?: Date;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);

// Ensure dates are properly serialized to JSON
CertificateSchema.set('toJSON', {
  transform: function (_doc: any, ret: any) {
    // Convert Date objects to ISO strings for proper JSON serialization
    if (ret.issuedAt instanceof Date) {
      ret.issuedAt = ret.issuedAt.toISOString();
    }
    if (ret.createdAt instanceof Date) {
      ret.createdAt = ret.createdAt.toISOString();
    }
    if (ret.updatedAt instanceof Date) {
      ret.updatedAt = ret.updatedAt.toISOString();
    }
    if (ret.emailSentAt instanceof Date) {
      ret.emailSentAt = ret.emailSentAt.toISOString();
    }
    if (ret.revokedAt instanceof Date) {
      ret.revokedAt = ret.revokedAt.toISOString();
    }
    if (ret.expiryDate instanceof Date) {
      ret.expiryDate = ret.expiryDate.toISOString();
    }
    return ret;
  },
});

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

  @Prop({ type: Types.ObjectId, ref: 'CourseModule' })
  module?: Types.ObjectId | CourseModule;

  @Prop({ type: Types.ObjectId, ref: 'Lesson' })
  lesson?: Types.ObjectId | Lesson;

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

  @Prop({ type: [{ type: Object }], default: [] })
  submissions: any[];
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

// Performance indexes for common queries
AssignmentSchema.index({ course: 1, dueDate: 1 }); // For course assignments with due date sorting
AssignmentSchema.index({ module: 1 }); // For module assignments
AssignmentSchema.index({ lesson: 1 }); // For lesson assignments
AssignmentSchema.index({ instructor: 1, createdAt: -1 }); // For instructor's assignments
AssignmentSchema.index({ course: 1, module: 1 }); // Composite index for course module assignments

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

// Performance indexes for common queries
AssignmentSubmissionSchema.index(
  { assignment: 1, student: 1 },
  { unique: true },
); // For unique submission check
AssignmentSubmissionSchema.index({ student: 1, submittedAt: -1 }); // For student submissions
AssignmentSubmissionSchema.index({ assignment: 1, submittedAt: -1 }); // For assignment submissions
AssignmentSubmissionSchema.index({ assignment: 1, grade: 1 }); // For grading queries
