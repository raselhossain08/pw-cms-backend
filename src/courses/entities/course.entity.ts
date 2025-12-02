import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CourseType {
  THEORETICAL = 'theoretical',
  PRACTICAL = 'practical',
  SIMULATOR = 'simulator',
  COMBINED = 'combined',
}

@Schema({ timestamps: true })
export class Course extends Document {
  @ApiProperty({
    example: 'ATP Certification Course',
    description: 'Course title',
  })
  @Prop({ required: true })
  title: string;

  @ApiProperty({
    example: 'Complete ATP certification training',
    description: 'Course description',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: 'atp-certification-course', description: 'URL slug' })
  @Prop({ required: true, unique: true })
  slug: string;

  @ApiProperty({
    example: 'Advanced training for airline transport pilots',
    description: 'Short excerpt',
  })
  @Prop()
  excerpt: string;

  @ApiProperty({
    enum: CourseLevel,
    example: CourseLevel.ADVANCED,
    description: 'Course difficulty level',
  })
  @Prop({ type: String, enum: CourseLevel, required: true })
  level: CourseLevel;

  @ApiProperty({
    enum: CourseType,
    example: CourseType.COMBINED,
    description: 'Course type',
  })
  @Prop({ type: String, enum: CourseType, required: true })
  type: CourseType;

  @ApiProperty({
    enum: CourseStatus,
    example: CourseStatus.PUBLISHED,
    description: 'Course status',
  })
  @Prop({ type: String, enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @ApiProperty({ example: 2999.99, description: 'Course price' })
  @Prop({ required: true, default: 0 })
  price: number;

  @ApiProperty({
    example: 3999.99,
    description: 'Original price for discounts',
    required: false,
  })
  @Prop()
  originalPrice: number;

  @ApiProperty({ example: 40, description: 'Course duration in hours' })
  @Prop({ required: true })
  duration: number;

  @ApiProperty({
    example: 'https://example.com/course-image.jpg',
    description: 'Course thumbnail',
  })
  @Prop()
  thumbnail: string;

  @ApiProperty({
    example: ['ATP', 'FAA'],
    description: 'Required prerequisites',
  })
  @Prop([String])
  prerequisites: string[];

  @ApiProperty({
    example: ['Commercial Pilot License'],
    description: 'What you will learn',
  })
  @Prop([String])
  learningObjectives: string[];

  @ApiProperty({
    example: ['Certificate', 'License'],
    description: 'What you will get',
  })
  @Prop([String])
  outcomes: string[];

  @ApiProperty({ example: 4.8, description: 'Average rating' })
  @Prop({ default: 0 })
  rating: number;

  @ApiProperty({ example: 1250, description: 'Total reviews count' })
  @Prop({ default: 0 })
  reviewCount: number;

  @ApiProperty({ example: 5000, description: 'Total students enrolled' })
  @Prop({ default: 0 })
  studentCount: number;

  @ApiProperty({ example: 95, description: 'Completion rate percentage' })
  @Prop({ default: 0 })
  completionRate: number;

  @ApiProperty({ type: String, description: 'Instructor ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  instructor: Types.ObjectId | User;

  @ApiProperty({
    example: ['airline', 'certification'],
    description: 'Course categories',
  })
  @Prop([String])
  categories: string[];

  @ApiProperty({
    example: ['Boeing 737', 'Airbus A320'],
    description: 'Aircraft types covered',
  })
  @Prop([String])
  aircraftTypes: string[];

  @ApiProperty({ example: true, description: 'Featured course flag' })
  @Prop({ default: false })
  isFeatured: boolean;

  @ApiProperty({ example: true, description: 'Certificate provided flag' })
  @Prop({ default: false })
  providesCertificate: boolean;

  @ApiProperty({ example: 30, description: 'Money back guarantee days' })
  @Prop({ default: 0 })
  moneyBackGuarantee: number;

  @ApiProperty({
    example: { en: 'English', es: 'Spanish' },
    description: 'Available languages',
  })
  @Prop({ type: Object, default: { en: 'English' } })
  languages: Record<string, string>;

  @ApiProperty({
    example: 10,
    description: 'Maximum students for practical courses',
  })
  @Prop()
  maxStudents: number;

  @Prop({ type: Object })
  metadata: {
    faaApproved: boolean;
    simulatorHours: number;
    flightHours: number;
    writtenExam: boolean;
    practicalExam: boolean;
  };

  @Prop({ default: 0 })
  totalRevenue: number;

  @Prop({ default: 0 })
  totalEnrollments: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Add proper JSON serialization
CourseSchema.set('toJSON', {
  transform: function (doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  },
});
