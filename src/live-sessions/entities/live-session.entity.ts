import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum SessionType {
  LIVE_CLASS = 'live_class',
  WEBINAR = 'webinar',
  ONE_ON_ONE = 'one_on_one',
  GROUP_DISCUSSION = 'group_discussion',
}

@Schema({ timestamps: true })
export class LiveSession extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId;

  @Prop({ type: String, enum: SessionType, default: SessionType.LIVE_CLASS })
  type: SessionType;

  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ required: true })
  duration: number; // Minutes

  @Prop()
  meetingUrl?: string;

  @Prop()
  meetingId?: string;

  @Prop()
  meetingPassword?: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  attendees: Types.ObjectId[];

  @Prop({ default: 100 })
  maxAttendees: number;

  @Prop()
  recordingUrl?: string;

  @Prop({ default: false })
  isRecorded: boolean;

  @Prop({ default: true })
  allowChat: boolean;

  @Prop({ default: false })
  allowQA: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  thumbnailUrl?: string;

  @Prop({ default: true })
  sendReminders: boolean;

  @Prop({ type: Map, of: Date, default: {} })
  attendanceLog: Map<string, Date>;
}

export const LiveSessionSchema = SchemaFactory.createForClass(LiveSession);

// Indexes
LiveSessionSchema.index({ course: 1, scheduledAt: 1 });
LiveSessionSchema.index({ instructor: 1, status: 1 });
LiveSessionSchema.index({ status: 1, scheduledAt: 1 });
