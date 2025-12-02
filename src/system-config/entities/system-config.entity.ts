import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ConfigCategory {
  PAYMENT = 'payment',
  AI = 'ai',
  EMAIL = 'email',
  STORAGE = 'storage',
  SOCIAL = 'social',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class SystemConfig extends Document {
  @Prop({ required: true })
  key: string;

  @Prop({ default: '' })
  value: string;

  @Prop({ type: String, enum: Object.values(ConfigCategory), required: true })
  category: ConfigCategory;

  @Prop({ required: true })
  label: string;

  @Prop()
  description?: string;

  @Prop({ default: false })
  isSecret: boolean; // If true, value will be masked in API responses

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isRequired: boolean;

  @Prop()
  placeholder?: string;

  @Prop()
  validationRegex?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional data like provider name, icon, etc.
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);

// Create indexes
SystemConfigSchema.index({ key: 1 }, { unique: true });
SystemConfigSchema.index({ category: 1 });
SystemConfigSchema.index({ isActive: 1 });
