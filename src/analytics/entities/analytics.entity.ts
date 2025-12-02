import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class AnalyticsEvent extends Document {
  @ApiProperty({ example: 'page_view', description: 'Event type' })
  @Prop({ required: true })
  eventType: string;

  @ApiProperty({ example: 'homepage', description: 'Event category' })
  @Prop()
  category: string;

  @ApiProperty({ example: 'Home Page Load', description: 'Event action' })
  @Prop()
  action: string;

  @ApiProperty({ example: 'Homepage', description: 'Event label' })
  @Prop()
  label: string;

  @ApiProperty({ example: 1, description: 'Event value' })
  @Prop()
  value: number;

  @ApiProperty({ type: String, description: 'User ID', required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @ApiProperty({ example: '127.0.0.1', description: 'User IP address' })
  @Prop()
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent' })
  @Prop()
  userAgent: string;

  @ApiProperty({ example: '/home', description: 'Page URL' })
  @Prop()
  pageUrl: string;

  @ApiProperty({ example: 'Home', description: 'Page title' })
  @Prop()
  pageTitle: string;

  @ApiProperty({ example: 'en-US', description: 'User language' })
  @Prop()
  language: string;

  @ApiProperty({ example: '1920x1080', description: 'Screen resolution' })
  @Prop()
  screenResolution: string;

  @ApiProperty({ example: 'Chrome', description: 'Browser' })
  @Prop()
  browser: string;

  @ApiProperty({ example: 'Windows', description: 'Operating system' })
  @Prop()
  os: string;

  @ApiProperty({ example: 'Desktop', description: 'Device type' })
  @Prop()
  deviceType: string;

  @ApiProperty({ type: Object, description: 'Custom properties' })
  @Prop({ type: Object })
  properties: Record<string, any>;

  @ApiProperty({ example: 'session_123', description: 'Session ID' })
  @Prop()
  sessionId: string;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);
