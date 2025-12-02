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

  @Prop({ required: true, type: [String] })
  content: string[];
}

@Schema({ _id: false })
export class PolicySection {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: [String] })
  content: string[];

  @Prop({ type: [SubSection] })
  subsections?: SubSection[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

@Schema({ _id: false })
export class ContactInfo {
  @Prop({ required: true })
  refundDepartment: string;

  @Prop({ required: true })
  generalSupport: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  businessHours: string;

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

@Schema({ timestamps: true })
export class RefundPolicy extends Document {
  @Prop({ type: HeaderSection, required: true })
  headerSection: HeaderSection;

  @Prop({ required: true })
  lastUpdated: string;

  @Prop({ type: [PolicySection], required: true })
  sections: PolicySection[];

  @Prop({ type: ContactInfo, required: true })
  contactInfo: ContactInfo;

  @Prop({ type: SeoMeta, required: true })
  seoMeta: SeoMeta;

  @Prop({ default: true })
  isActive: boolean;
}

export const RefundPolicySchema = SchemaFactory.createForClass(RefundPolicy);
