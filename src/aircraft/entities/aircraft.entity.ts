import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum AircraftStatus {
    AVAILABLE = 'Available',
    RESERVED = 'Reserved',
    UNDER_CONTRACT = 'Under Contract',
    SOLD = 'Sold',
}

export enum AircraftType {
    PISTON_SINGLE = 'Piston Single',
    PISTON_MULTI = 'Piston Multi',
    TURBOPROP = 'Turboprop',
    BUSINESS_JET = 'Business Jet',
    HELICOPTER = 'Helicopter',
}

@Schema({ timestamps: true })
export class Aircraft extends Document {
    @ApiProperty({
        example: 'Cessna 172S',
        description: 'Aircraft title/model name',
    })
    @Prop({ required: true })
    title: string;

    @ApiProperty({ example: '2018', description: 'Model year' })
    @Prop({ required: true })
    modelYear: string; @ApiProperty({
        example: 'Cessna',
        description: 'Aircraft manufacturer',
    })
    @Prop({ required: true })
    manufacturer: string;

    @ApiProperty({
        enum: AircraftType,
        example: AircraftType.PISTON_SINGLE,
        description: 'Type of aircraft',
    })
    @Prop({ required: true, enum: Object.values(AircraftType) })
    type: AircraftType;

    @ApiProperty({
        enum: AircraftStatus,
        example: AircraftStatus.AVAILABLE,
        description: 'Current status of the listing',
    })
    @Prop({
        required: true,
        enum: Object.values(AircraftStatus),
        default: AircraftStatus.AVAILABLE,
    })
    status: AircraftStatus;

    @ApiProperty({ example: 389000, description: 'Price in USD' })
    @Prop({ required: true })
    price: number;

    @ApiProperty({
        example: '1,240 TTAF',
        description: 'Total time airframe hours',
    })
    @Prop({ required: true })
    hours: string;

    @ApiProperty({
        example: 'KAPA – Denver, CO',
        description: 'Aircraft location',
    })
    @Prop({ required: true })
    location: string;

    @ApiProperty({
        example: 'Lycoming IO-360',
        description: 'Engine type',
        required: false,
    })
    @Prop()
    engine?: string;

    @ApiProperty({
        example: 'Garmin G1000 NXi',
        description: 'Avionics package',
        required: false,
    })
    @Prop()
    avionics?: string;

    @ApiProperty({
        example: 'https://example.com/aircraft.jpg',
        description: 'Main image URL',
        required: false,
    })
    @Prop()
    imageUrl?: string;

    @ApiProperty({
        example: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        description: 'Additional image URLs',
        required: false,
    })
    @Prop({ type: [String], default: [] })
    images?: string[];

    @ApiProperty({
        example: 'Detailed description of the aircraft...',
        description: 'Full description',
        required: false,
    })
    @Prop()
    description?: string;

    @ApiProperty({
        example: ['IFR Certified', 'Fresh Annual', 'New Paint'],
        description: 'Key features and highlights',
        required: false,
    })
    @Prop({ type: [String], default: [] })
    features?: string[];

    @ApiProperty({
        example: true,
        description: 'Whether price is negotiable',
    })
    @Prop({ default: true })
    negotiable: boolean;

    @ApiProperty({
        example: 'John Doe',
        description: 'Seller/contact name',
        required: false,
    })
    @Prop()
    contactName?: string;

    @ApiProperty({
        example: 'john@example.com',
        description: 'Contact email',
        required: false,
    })
    @Prop()
    contactEmail?: string;

    @ApiProperty({
        example: '+1-555-0123',
        description: 'Contact phone',
        required: false,
    })
    @Prop()
    contactPhone?: string;

    @ApiProperty({
        example: 150,
        description: 'Number of views',
    })
    @Prop({ default: 0 })
    views: number;

    @ApiProperty({
        example: 25,
        description: 'Number of inquiries',
    })
    @Prop({ default: 0 })
    inquiries: number;

    @ApiProperty({ description: 'Created at timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at timestamp' })
    updatedAt: Date;
}

export const AircraftSchema = SchemaFactory.createForClass(Aircraft);

// Create indexes for better performance
AircraftSchema.index({ status: 1, type: 1 });
AircraftSchema.index({ price: 1 });
AircraftSchema.index({ createdAt: -1 });
