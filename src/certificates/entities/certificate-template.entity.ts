import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CertificateTemplateDocument = CertificateTemplate & Document;

@Schema({ timestamps: true })
export class CertificateTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  elements: any[];

  @Prop({ required: true })
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
}

export const CertificateTemplateSchema =
  SchemaFactory.createForClass(CertificateTemplate);
