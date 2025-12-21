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
export class ContentSection {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string; // HTML content from rich text editor

  @Prop()
  image?: string;

  @Prop()
  imageAlt?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
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
export class TeamMember {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  position: string;

  @Prop()
  image?: string;

  @Prop()
  imageAlt?: string;

  @Prop()
  bio?: string;

  @Prop()
  certifications?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

@Schema({ _id: false })
export class TeamSection {
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  title?: string;

  @Prop()
  subtitle?: string;

  @Prop()
  description?: string;

  @Prop({ type: [TeamMember], default: [] })
  members: TeamMember[];
}

@Schema({ _id: false })
export class StatsSection {
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [{ value: String, label: String }], default: [] })
  stats: Array<{ value: string; label: string }>;
}

@Schema({ timestamps: true })
export class AboutUs extends Document {
  @Prop({ type: HeaderSection, required: true })
  headerSection: HeaderSection;

  @Prop({ type: [ContentSection], required: true, default: [] })
  sections: ContentSection[];

  @Prop({ type: TeamSection, default: { isActive: true, members: [] } })
  teamSection?: TeamSection;

  @Prop({ type: StatsSection, default: { isActive: true, stats: [] } })
  statsSection?: StatsSection;

  @Prop({ type: SeoMeta, required: true })
  seo: SeoMeta;

  @Prop({ default: true })
  isActive: boolean;
}

export const AboutUsSchema = SchemaFactory.createForClass(AboutUs);
