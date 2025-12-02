import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CampaignType {
  EMAIL = 'email',
  SOCIAL_MEDIA = 'social_media',
  PPC = 'ppc',
  AFFILIATE = 'affiliate',
  CONTENT = 'content',
  REFERRAL = 'referral',
  RETARGETING = 'retargeting',
  INFLUENCER = 'influencer',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Campaign extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: CampaignType, required: true })
  type: CampaignType;

  @Prop({ type: String, enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  endDate: Date;

  @Prop({ type: Number, default: 0 })
  budget: number;

  @Prop({ type: Number, default: 0 })
  spent: number;

  @Prop({ type: String })
  targetAudience: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: String })
  utmSource: string;

  @Prop({ type: String })
  utmMedium: string;

  @Prop({ type: String })
  utmCampaign: string;

  @Prop({ type: String })
  utmContent: string;

  @Prop({ type: String })
  landingPage: string;

  // Analytics
  @Prop({ type: Number, default: 0 })
  impressions: number;

  @Prop({ type: Number, default: 0 })
  clicks: number;

  @Prop({ type: Number, default: 0 })
  conversions: number;

  @Prop({ type: Number, default: 0 })
  revenue: number;

  @Prop({ type: Number, default: 0 })
  leads: number;

  @Prop({ type: Number, default: 0 })
  uniqueVisitors: number;

  @Prop({ type: Number, default: 0 })
  bounceRate: number;

  @Prop({ type: Number, default: 0 })
  avgSessionDuration: number;

  @Prop({ type: Map, of: Number, default: {} })
  dailyMetrics: Map<string, number>; // date -> conversions

  @Prop({ type: Object, default: {} })
  customData: Record<string, any>;

  @Prop({ type: Date })
  lastTrackedAt: Date;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

// Indexes
CampaignSchema.index({ createdBy: 1, status: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });
CampaignSchema.index({ utmSource: 1, utmMedium: 1, utmCampaign: 1 });
CampaignSchema.index({ type: 1, status: 1 });

// Virtual for CTR (Click-Through Rate)
CampaignSchema.virtual('ctr').get(function () {
  return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
});

// Virtual for Conversion Rate
CampaignSchema.virtual('conversionRate').get(function () {
  return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
});

// Virtual for ROI (Return on Investment)
CampaignSchema.virtual('roi').get(function () {
  return this.spent > 0 ? ((this.revenue - this.spent) / this.spent) * 100 : 0;
});

// Virtual for CPC (Cost Per Click)
CampaignSchema.virtual('cpc').get(function () {
  return this.clicks > 0 ? this.spent / this.clicks : 0;
});

// Virtual for CPA (Cost Per Acquisition)
CampaignSchema.virtual('cpa').get(function () {
  return this.conversions > 0 ? this.spent / this.conversions : 0;
});

CampaignSchema.set('toJSON', { virtuals: true });
CampaignSchema.set('toObject', { virtuals: true });

@Schema({ timestamps: true })
export class CampaignEvent extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  eventType: string; // impression, click, conversion, lead, etc.

  @Prop({ type: String })
  source: string;

  @Prop({ type: String })
  medium: string;

  @Prop({ type: String })
  referrer: string;

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
  value: number; // monetary value for conversions

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const CampaignEventSchema = SchemaFactory.createForClass(CampaignEvent);

// Indexes
CampaignEventSchema.index({ campaignId: 1, eventType: 1, createdAt: -1 });
CampaignEventSchema.index({ userId: 1, createdAt: -1 });
CampaignEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL
