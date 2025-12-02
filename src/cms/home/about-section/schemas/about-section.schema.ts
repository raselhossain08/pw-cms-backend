import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Highlight {
  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  text: string;
}

@Schema({ _id: false })
export class CTA {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  link: string;
}

@Schema({ _id: false })
export class Stat {
  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  suffix: string;

  @Prop({ required: true })
  label: string;
}

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

  @Prop({ default: '' })
  ogTitle: string;

  @Prop({ default: '' })
  ogDescription: string;

  @Prop({ default: '' })
  canonicalUrl: string;
}

@Schema({ timestamps: true })
export class AboutSection extends Document {
  @Prop({ required: true, default: 'about', unique: true })
  declare id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  image: string;

  @Prop({ type: [Highlight], default: [] })
  highlights: Highlight[];

  @Prop({ type: CTA, required: true })
  cta: CTA;

  @Prop({ type: [Stat], default: [] })
  stats: Stat[];

  @Prop({ type: SeoMeta, default: {} })
  seo: SeoMeta;

  @Prop({ default: true })
  isActive: boolean;
}

export const AboutSectionSchema = SchemaFactory.createForClass(AboutSection);
