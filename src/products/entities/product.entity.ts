import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../src/users/entities/user.entity';

export enum ProductType {
  AIRCRAFT = 'aircraft',
  SIMULATOR = 'simulator',
  EQUIPMENT = 'equipment',
  SOFTWARE = 'software',
  SERVICE = 'service',
}

export enum ProductStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SOLD = 'sold',
}

export enum AircraftCategory {
  SINGLE_ENGINE = 'single_engine',
  MULTI_ENGINE = 'multi_engine',
  JET = 'jet',
  TURBOPROP = 'turboprop',
  HELICOPTER = 'helicopter',
}

@Schema({ timestamps: true })
export class Product extends Document {
  @ApiProperty({ example: 'Cessna 172 Skyhawk', description: 'Product title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ example: 'cessna-172-skyhawk', description: 'Product slug' })
  @Prop({ required: true, unique: true })
  slug: string;

  @ApiProperty({
    example: 'Well-maintained Cessna 172...',
    description: 'Product description',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({
    enum: ProductType,
    example: ProductType.AIRCRAFT,
    description: 'Product type',
  })
  @Prop({ type: String, enum: ProductType, required: true })
  type: ProductType;

  @ApiProperty({
    enum: ProductStatus,
    example: ProductStatus.PUBLISHED,
    description: 'Product status',
  })
  @Prop({ type: String, enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @ApiProperty({ example: 250000, description: 'Product price' })
  @Prop({ required: true })
  price: number;

  @ApiProperty({ example: 'USD', description: 'Currency' })
  @Prop({ default: 'USD' })
  currency: string;

  @ApiProperty({
    enum: AircraftCategory,
    example: AircraftCategory.SINGLE_ENGINE,
    description: 'Aircraft category',
    required: false,
  })
  @Prop({ type: String, enum: AircraftCategory })
  aircraftCategory: AircraftCategory;

  @ApiProperty({
    example: 'Cessna',
    description: 'Manufacturer',
    required: false,
  })
  @Prop()
  manufacturer: string;

  @ApiProperty({
    example: '172 Skyhawk',
    description: 'Model',
    required: false,
  })
  @Prop()
  productModel: string;

  @ApiProperty({
    example: 1978,
    description: 'Year of manufacture',
    required: false,
  })
  @Prop()
  year: number;

  @ApiProperty({
    example: 1200,
    description: 'Total time on airframe',
    required: false,
  })
  @Prop()
  totalTime: number;

  @ApiProperty({
    example: 300,
    description: 'Time since overhaul',
    required: false,
  })
  @Prop()
  timeSinceOverhaul: number;

  @ApiProperty({
    example: 'Lycoming O-320',
    description: 'Engine model',
    required: false,
  })
  @Prop()
  engineModel: string;

  @ApiProperty({
    example: 160,
    description: 'Engine horsepower',
    required: false,
  })
  @Prop()
  engineHorsepower: number;

  @ApiProperty({
    example: 'Garmin G1000',
    description: 'Avionics package',
    required: false,
  })
  @Prop()
  avionics: string;

  @ApiProperty({
    example: ['IFR', 'GPS', 'Autopilot'],
    description: 'Features',
    required: false,
  })
  @Prop([String])
  features: string[];

  @ApiProperty({
    example: ['logbook.pdf', 'maintenance.pdf'],
    description: 'Documentation files',
    required: false,
  })
  @Prop([String])
  documentation: string[];

  @ApiProperty({
    example: 'KAPA',
    description: 'Location airport code',
    required: false,
  })
  @Prop()
  location: string;

  @ApiProperty({
    example: 'Centennial Airport, CO',
    description: 'Location description',
    required: false,
  })
  @Prop()
  locationDescription: string;

  @ApiProperty({ type: [String], description: 'Image URLs', required: false })
  @Prop([String])
  images: string[];

  @ApiProperty({ type: String, description: 'Seller ID' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  seller: Types.ObjectId | User;

  @ApiProperty({ example: true, description: 'Featured product flag' })
  @Prop({ default: false })
  isFeatured: boolean;

  @ApiProperty({ example: 4.8, description: 'Average rating' })
  @Prop({ default: 0 })
  rating: number;

  @ApiProperty({ example: 15, description: 'Review count' })
  @Prop({ default: 0 })
  reviewCount: number;

  @ApiProperty({ example: 50, description: 'View count' })
  @Prop({ default: 0 })
  viewCount: number;

  @ApiProperty({ example: 5, description: 'Inquiry count' })
  @Prop({ default: 0 })
  inquiryCount: number;

  @Prop({ type: Object })
  specifications: {
    seats: number;
    cruiseSpeed: number;
    range: number;
    fuelCapacity: number;
    maxTakeoffWeight: number;
    usefulLoad: number;
  };

  @Prop({ type: Object })
  maintenance: {
    lastAnnual: Date;
    nextAnnual: Date;
    last100Hour: Date;
    next100Hour: Date;
    damageHistory: boolean;
    damageDescription: string;
  };

  @ApiProperty({
    example: ['single_engine', 'ifr_capable'],
    description: 'Product tags',
    required: false,
  })
  @Prop([String])
  tags: string[];

  @ApiProperty({ example: 2, description: 'Quantity available' })
  @Prop({ default: 1 })
  quantity: number;

  @Prop({ default: 0 })
  soldCount: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
