import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CourseModuleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Schema({ timestamps: true })
export class CourseModule extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
  courses: Types.ObjectId[];

  @Prop({ required: true, default: 1 })
  order: number;

  @Prop({ default: 0 })
  duration: number;

  @Prop({
    type: String,
    enum: CourseModuleStatus,
    default: CourseModuleStatus.DRAFT,
  })
  status: CourseModuleStatus;
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);
CourseModuleSchema.index({ course: 1, order: 1 });
