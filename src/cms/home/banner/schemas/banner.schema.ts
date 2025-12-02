import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

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

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  videoUrl: string;

  @Prop({ required: true })
  thumbnail: string;

  @Prop({ required: true })
  alt: string;

  @Prop({ required: true })
  link: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: SeoMeta, default: {} })
  seo: SeoMeta;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
