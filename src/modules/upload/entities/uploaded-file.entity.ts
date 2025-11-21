import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UploadedFile {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimetype: string;

  @Prop({ required: true })
  size: number;

  @Prop()
  path?: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: 'general' })
  folder: string;

  @Prop({ default: Date.now })
  uploadedAt: Date;

  @Prop({ enum: ['local', 'cloudinary'], default: 'local' })
  storageType: string;

  @Prop()
  cloudinaryPublicId?: string;

  @Prop()
  cloudinarySecureUrl?: string;

  @Prop()
  width?: number;

  @Prop()
  height?: number;

  @Prop()
  format?: string;

  @Prop({ type: Object })
  responsiveUrls?: any;

  // Mongoose timestamps will add createdAt and updatedAt
  createdAt?: Date;
  updatedAt?: Date;
}

export type UploadedFileDocument = UploadedFile & Document;
export const UploadedFileSchema = SchemaFactory.createForClass(UploadedFile);