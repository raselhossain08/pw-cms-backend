import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CourseCategory extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  image?: string;

  @Prop({ type: String })
  icon?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CourseCategorySchema =
  SchemaFactory.createForClass(CourseCategory);
