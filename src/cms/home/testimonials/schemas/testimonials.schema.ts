import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Testimonial {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  company: string;

  @Prop({ required: true })
  avatar: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: '' })
  fallback: string;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);

@Schema({ _id: false })
export class SeoMeta {
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  keywords: string;

  @Prop({ default: '' })
  ogImage: string;
}

export const SeoMetaSchema = SchemaFactory.createForClass(SeoMeta);

@Schema({ timestamps: true })
export class Testimonials extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [TestimonialSchema], default: [] })
  testimonials: Testimonial[];

  @Prop({ type: SeoMetaSchema, default: {} })
  seo: SeoMeta;

  @Prop({ default: true })
  isActive: boolean;
}

export const TestimonialsSchema = SchemaFactory.createForClass(Testimonials);
