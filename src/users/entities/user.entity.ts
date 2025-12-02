import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  STUDENT = 'student',
  AFFILIATE = 'affiliate',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class User extends Document {
  @ApiProperty({ example: 'john@personalwings.com', description: 'User email' })
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @Prop({ required: true })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.STUDENT,
    description: 'User role',
  })
  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
  })
  @Prop({ type: String, enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @Prop()
  phone: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
    required: false,
  })
  @Prop()
  avatar: string;

  @ApiProperty({ example: 'US', description: 'Country', required: false })
  @Prop()
  country: string;

  @ApiProperty({
    example: 'California',
    description: 'State/Province',
    required: false,
  })
  @Prop()
  state: string;

  @ApiProperty({ example: 'Los Angeles', description: 'City', required: false })
  @Prop()
  city: string;

  @ApiProperty({
    example: 'john-doe',
    description: 'URL-friendly slug for instructor profiles',
    required: false,
  })
  @Prop({ unique: true, sparse: true })
  slug: string;

  @ApiProperty({
    example: 'Pilot with 10+ years experience',
    description: 'Bio',
    required: false,
  })
  @Prop()
  bio: string;

  @ApiProperty({
    example: ['ATP', 'CFI'],
    description: 'Certifications',
    required: false,
  })
  @Prop([String])
  certifications: string[];

  @ApiProperty({
    example: 1500,
    description: 'Total flight hours',
    required: false,
  })
  @Prop({ default: 0 })
  flightHours: number;

  @Prop()
  emailVerified: boolean;

  @Prop()
  emailVerificationToken: string;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetExpires: Date;

  @Prop({ default: 0 })
  loginCount: number;

  @Prop()
  lastLogin: Date;

  @Prop()
  refreshToken: string;

  @Prop({ type: Object })
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    language: string;
    timezone: string;
  };

  @Prop({ type: Object })
  billingAddress: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop({ default: 0 })
  completedCourses: number;

  // Virtuals
  fullName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized and ObjectIds are converted to strings
UserSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id.toString();
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

// Performance indexes for common queries
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ country: 1 });
