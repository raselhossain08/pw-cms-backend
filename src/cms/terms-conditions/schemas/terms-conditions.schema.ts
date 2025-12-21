import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class HeaderSection {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop()
  image?: string;

  @Prop()
  imageAlt?: string;
}

@Schema({ _id: false })
export class SubSection {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [String], required: true })
  content: string[];
}

@Schema({ _id: false })
export class TermsSection {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [String], required: true })
  content: string[];

  @Prop({ type: [SubSection], default: [] })
  subsections?: SubSection[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true })
  order: number;
}

@Schema({ _id: false })
export class ContactInfo {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  address: string;
}

@Schema({ _id: false })
export class SeoMeta {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop()
  ogTitle?: string;

  @Prop()
  ogDescription?: string;

  @Prop()
  ogImage?: string;

  @Prop()
  canonicalUrl?: string;
}

@Schema({ _id: false })
export class AcceptanceSection {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({ timestamps: true })
export class TermsConditions extends Document {
  @Prop({ type: HeaderSection, required: true })
  headerSection: HeaderSection;

  @Prop({ required: true })
  lastUpdated: string;

  @Prop({ type: [TermsSection], required: true })
  sections: TermsSection[];

  @Prop({ type: ContactInfo, required: true })
  contactInfo: ContactInfo;

  @Prop({ type: SeoMeta, required: true })
  seoMeta: SeoMeta;

  @Prop({ type: AcceptanceSection, required: true })
  acceptanceSection: AcceptanceSection;

  @Prop({ default: true })
  isActive: boolean;
}

export const TermsConditionsSchema =
  SchemaFactory.createForClass(TermsConditions);
