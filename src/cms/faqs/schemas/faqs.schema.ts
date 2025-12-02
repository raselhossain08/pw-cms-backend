import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FaqsDocument = Faqs & Document;

@Schema()
class SeoMeta {
  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  keywords?: string;

  @Prop()
  ogImage?: string;

  @Prop()
  ogTitle?: string;

  @Prop()
  ogDescription?: string;

  @Prop()
  canonicalUrl?: string;
}

@Schema()
class HeaderSection {
  @Prop({ required: true })
  badge: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  image?: string;

  @Prop()
  imageAlt?: string;
}

@Schema()
class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ default: 0 })
  count: number;

  @Prop({ required: true })
  color: string;
}

@Schema()
class FaqItem {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

@Schema({ timestamps: true })
export class Faqs {
  @Prop({ type: HeaderSection, required: true })
  headerSection: HeaderSection;

  @Prop({ type: [Category], default: [] })
  categories: Category[];

  @Prop({ type: [FaqItem], default: [] })
  faqs: FaqItem[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: SeoMeta })
  seo?: SeoMeta;
}

export const FaqsSchema = SchemaFactory.createForClass(Faqs);
