import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

export enum FileType {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  OTHER = 'other',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class File extends Document {
  @ApiProperty({
    example: 'course-image.jpg',
    description: 'Original file name',
  })
  @Prop({ required: true })
  originalName: string;

  @ApiProperty({
    example: 'course-image-123.jpg',
    description: 'Stored file name',
  })
  @Prop({ required: true })
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', description: 'File MIME type' })
  @Prop({ required: true })
  mimeType: string;

  @ApiProperty({ example: 1024000, description: 'File size in bytes' })
  @Prop({ required: true })
  size: number;

  @ApiProperty({
    enum: FileType,
    example: FileType.IMAGE,
    description: 'File type',
  })
  @Prop({ type: String, enum: FileType, required: true })
  type: FileType;

  @ApiProperty({
    enum: FileStatus,
    example: FileStatus.COMPLETED,
    description: 'File status',
  })
  @Prop({ type: String, enum: FileStatus, default: FileStatus.UPLOADING })
  status: FileStatus;

  @ApiProperty({
    example: '/uploads/images/course-image-123.jpg',
    description: 'File path',
  })
  @Prop({ required: true })
  path: string;

  @ApiProperty({
    example: 'https://cdn.personalwings.com/images/course-image-123.jpg',
    description: 'File URL',
  })
  @Prop()
  url: string;

  @ApiProperty({ type: String, description: 'Uploaded by user ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId | User;

  @ApiProperty({
    example: 'Course thumbnail image',
    description: 'File description',
    required: false,
  })
  @Prop()
  description: string;

  @ApiProperty({
    example: ['thumbnail', 'course'],
    description: 'File tags',
    required: false,
  })
  @Prop([String])
  tags: string[];

  @ApiProperty({ type: Object, description: 'File metadata', required: false })
  @Prop({ type: Object })
  metadata: {
    width: number;
    height: number;
    duration: number;
    pages: number;
    format: string;
    compression: string;
  };

  @ApiProperty({
    example: 'public',
    description: 'File visibility',
    required: false,
  })
  @Prop({ default: 'public' })
  visibility: string;

  @Prop()
  processedAt: Date;

  @Prop()
  errorMessage: string;

  @ApiProperty({ example: 5, description: 'Download count', required: false })
  @Prop({ default: 0 })
  downloadCount: number;

  @ApiProperty({
    example: 'course_123',
    description: 'Associated entity ID',
    required: false,
  })
  @Prop()
  associatedEntity: string;

  @ApiProperty({
    example: 'course',
    description: 'Associated entity type',
    required: false,
  })
  @Prop()
  entityType: string;
}

export const FileSchema = SchemaFactory.createForClass(File);
