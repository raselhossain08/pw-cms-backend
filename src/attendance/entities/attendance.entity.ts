import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Attendance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'LiveSession', required: true })
  sessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  @Prop({ type: Date })
  leftAt: Date;

  @Prop({ type: Number, default: 0 })
  duration: number; // Duration in minutes

  @Prop({ type: Boolean, default: true })
  present: boolean;

  @Prop({ type: String })
  ipAddress: string;

  @Prop({ type: String })
  deviceInfo: string;

  @Prop({ type: [{ timestamp: Date, action: String }], default: [] })
  activityLog: Array<{ timestamp: Date; action: string }>;

  @Prop({ type: Boolean, default: false })
  certificateEligible: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Indexes
AttendanceSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
AttendanceSchema.index({ userId: 1, present: 1 });
AttendanceSchema.index({ courseId: 1 });
AttendanceSchema.index({ createdAt: -1 });
