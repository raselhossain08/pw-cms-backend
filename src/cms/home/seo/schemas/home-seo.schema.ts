import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class HomeSEO extends Document {
  @Prop({ required: true, default: 'Home - Your Learning Platform' })
  title: string;

  @Prop({ required: true, default: 'Welcome to our learning platform' })
  description: string;

  @Prop({ type: [String], default: ['learning', 'courses', 'education'] })
  keywords: string[];

  @Prop()
  ogTitle?: string;

  @Prop()
  ogDescription?: string;

  @Prop()
  ogImage?: string;

  @Prop({ default: 'summary_large_image' })
  twitterCard?: string;

  @Prop()
  twitterTitle?: string;

  @Prop()
  twitterDescription?: string;

  @Prop()
  twitterImage?: string;

  @Prop()
  canonical?: string;

  @Prop({ default: 'index, follow' })
  robots?: string;

  @Prop()
  author?: string;

  @Prop({ default: 'en_US' })
  locale?: string;

  @Prop()
  siteName?: string;

  @Prop({ type: Object })
  structuredData?: any;

  @Prop({ default: true })
  isActive: boolean;
}

export const HomeSEOSchema = SchemaFactory.createForClass(HomeSEO);
