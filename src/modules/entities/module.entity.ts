import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export enum ModuleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class CourseModule extends Document {
  @Prop({ required: true })
  title: string

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId

  @Prop()
  description?: string

  @Prop({ type: Number, default: 0 })
  order: number

  @Prop({ type: String, enum: ModuleStatus, default: ModuleStatus.DRAFT })
  status: ModuleStatus

  @Prop({ type: Number, default: 0 })
  duration?: number

  @Prop({ type: Number, default: 0 })
  lessonsCount?: number
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule)
CourseModuleSchema.index({ course: 1 })
CourseModuleSchema.index({ course: 1, order: 1 })
