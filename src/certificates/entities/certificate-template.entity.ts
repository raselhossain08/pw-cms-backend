import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CertificateTemplateDocument = CertificateTemplate & Document;

@Schema({ timestamps: true })
export class CertificateTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  elements: any[];

  @Prop({ required: false })
  thumbnail: string;

  @Prop({ type: [String], default: [] })
  dynamicFields: string[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  config: any;

  @Prop({ required: false })
  description: string;
}

export const CertificateTemplateSchema =
  SchemaFactory.createForClass(CertificateTemplate);
