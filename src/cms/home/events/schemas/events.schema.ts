import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class TrainingContent {
  @Prop({ required: true })
  text: string;
}

@Schema({ _id: false })
export class LearningPoint {
  @Prop({ required: true })
  text: string;
}

@Schema({ _id: false })
export class FAQ {
  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;
}

@Schema({ _id: false })
export class Instructor {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  bio: string;

  @Prop({ type: Object, default: {} })
  social: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

@Schema({ _id: false })
export class RelatedEvent {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ default: '' })
  badge: string;
}

@Schema({ _id: false })
export class Event {
  @Prop({ required: true })
  id: number;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  date: string;

  @Prop({ default: '' })
  time: string;

  @Prop({ default: '' })
  venue: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: '' })
  videoUrl: string;

  @Prop({ type: [Object], default: [] })
  trainingContent: TrainingContent[];

  @Prop({ type: [Object], default: [] })
  learningPoints: LearningPoint[];

  @Prop({ type: [Object], default: [] })
  faqs: FAQ[];

  @Prop({ type: [Object], default: [] })
  instructors: Instructor[];

  @Prop({ type: [Object], default: [] })
  relatedEvents: RelatedEvent[];
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
}

const EventSubSchema = SchemaFactory.createForClass(Event);
const SeoMetaSubSchema = SchemaFactory.createForClass(SeoMeta);

@Schema({
  timestamps: true,
  collection: 'cms_home_events',
})
export class Events extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop({ type: [EventSubSchema], default: [] })
  events: Event[];

  @Prop({ type: SeoMetaSubSchema })
  seo: SeoMeta;
}

export const EventsSchema = SchemaFactory.createForClass(Events);
