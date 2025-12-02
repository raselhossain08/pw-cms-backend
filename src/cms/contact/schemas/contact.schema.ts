import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ _id: false })
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

@Schema({ _id: false })
class ContactInfo {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  location: string;

  @Prop()
  phone?: string;
}

@Schema({ _id: false })
class ContactFormSection {
  @Prop({ required: true })
  badge: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  image: string;

  @Prop()
  imageAlt?: string;
}

@Schema({ _id: false })
class MapSection {
  @Prop({ required: true })
  embedUrl: string;

  @Prop({ default: true })
  showMap: boolean;
}

@Schema({ timestamps: true })
export class Contact {
  @Prop({ type: ContactInfo, required: true })
  contactInfo: ContactInfo;

  @Prop({ type: ContactFormSection, required: true })
  formSection: ContactFormSection;

  @Prop({ type: MapSection, required: true })
  mapSection: MapSection;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: SeoMeta, default: {} })
  seo: SeoMeta;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
