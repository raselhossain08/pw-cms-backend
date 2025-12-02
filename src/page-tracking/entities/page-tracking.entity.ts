import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PageView extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  page: string; // URL or page identifier

  @Prop({ type: String, required: true })
  path: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  referrer: string;

  @Prop({ type: String })
  source: string;

  @Prop({ type: String })
  medium: string;

  @Prop({ type: String })
  campaign: string;

  @Prop({ type: String })
  sessionId: string;

  @Prop({ type: String })
  ipAddress: string;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ type: String })
  deviceType: string; // mobile, desktop, tablet

  @Prop({ type: String })
  browser: string;

  @Prop({ type: String })
  os: string;

  @Prop({ type: String })
  country: string;

  @Prop({ type: String })
  city: string;

  @Prop({ type: Number, default: 0 })
  timeOnPage: number; // seconds

  @Prop({ type: Number, default: 0 })
  scrollDepth: number; // percentage

  @Prop({ type: Boolean, default: false })
  bounced: boolean;

  @Prop({ type: Boolean, default: false })
  converted: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const PageViewSchema = SchemaFactory.createForClass(PageView);

// Indexes
PageViewSchema.index({ userId: 1, createdAt: -1 });
PageViewSchema.index({ page: 1, createdAt: -1 });
PageViewSchema.index({ sessionId: 1, createdAt: -1 });
PageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 }); // 6 months TTL

@Schema({ timestamps: true })
export class UserSession extends Document {
  @Prop({ type: String, required: true, unique: true })
  sessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date })
  endTime: Date;

  @Prop({ type: Number, default: 0 })
  duration: number; // seconds

  @Prop({ type: Number, default: 0 })
  pageViews: number;

  @Prop({ type: [String], default: [] })
  pagesVisited: string[];

  @Prop({ type: String })
  landingPage: string;

  @Prop({ type: String })
  exitPage: string;

  @Prop({ type: String })
  referrer: string;

  @Prop({ type: String })
  source: string;

  @Prop({ type: String })
  medium: string;

  @Prop({ type: String })
  campaign: string;

  @Prop({ type: String })
  ipAddress: string;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ type: String })
  deviceType: string;

  @Prop({ type: String })
  browser: string;

  @Prop({ type: String })
  os: string;

  @Prop({ type: String })
  country: string;

  @Prop({ type: String })
  city: string;

  @Prop({ type: Boolean, default: false })
  converted: boolean;

  @Prop({ type: Number, default: 0 })
  revenue: number;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Indexes
UserSessionSchema.index({ sessionId: 1 });
UserSessionSchema.index({ userId: 1, startTime: -1 });
UserSessionSchema.index({ startTime: 1 });
UserSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 }); // 6 months TTL

@Schema({ timestamps: true })
export class UserEvent extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  sessionId: string;

  @Prop({ type: String, required: true })
  eventType: string; // click, scroll, form_submit, video_play, etc.

  @Prop({ type: String, required: true })
  eventCategory: string; // interaction, navigation, media, form

  @Prop({ type: String })
  eventLabel: string;

  @Prop({ type: String })
  page: string;

  @Prop({ type: String })
  element: string; // CSS selector or element ID

  @Prop({ type: Number })
  value: number;

  @Prop({ type: Number })
  positionX: number;

  @Prop({ type: Number })
  positionY: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const UserEventSchema = SchemaFactory.createForClass(UserEvent);

// Indexes
UserEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
UserEventSchema.index({ sessionId: 1, createdAt: -1 });
UserEventSchema.index({ page: 1, eventType: 1 });
UserEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 3 months TTL

@Schema({ timestamps: true })
export class Heatmap extends Document {
  @Prop({ type: String, required: true })
  page: string;

  @Prop({ type: String, required: true })
  eventType: string; // click, move, scroll

  @Prop({ type: Number, required: true })
  x: number;

  @Prop({ type: Number, required: true })
  y: number;

  @Prop({ type: Number, default: 1 })
  count: number;

  @Prop({ type: String })
  deviceType: string;

  @Prop({ type: Date, required: true })
  date: Date;
}

export const HeatmapSchema = SchemaFactory.createForClass(Heatmap);

// Indexes
HeatmapSchema.index({ page: 1, eventType: 1, date: -1 });
HeatmapSchema.index({ date: 1 }, { expireAfterSeconds: 7776000 }); // 3 months TTL
