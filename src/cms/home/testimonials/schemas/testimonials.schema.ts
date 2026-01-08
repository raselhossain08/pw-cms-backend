import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Testimonial {
  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  position: string;

  @Prop({ default: '' })
  company: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: 5, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
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
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
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
