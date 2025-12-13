import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsArray,
    IsEmail,
    Min,
} from 'class-validator';
import { AircraftType, AircraftStatus } from '../entities/aircraft.entity';

export class CreateAircraftDto {
    @ApiProperty({
        example: 'Cessna 172S',
        description: 'Aircraft title/model name',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: '2018', description: 'Model year' })
    @IsString()
    @IsNotEmpty()
    modelYear: string; @ApiProperty({
        example: 'Cessna',
        description: 'Aircraft manufacturer',
    })
    @IsString()
    @IsNotEmpty()
    manufacturer: string;

    @ApiProperty({
        enum: AircraftType,
        example: AircraftType.PISTON_SINGLE,
        description: 'Type of aircraft',
    })
    @IsEnum(AircraftType)
    @IsNotEmpty()
    type: AircraftType;

    @ApiProperty({
        enum: AircraftStatus,
        example: AircraftStatus.AVAILABLE,
        description: 'Current status of the listing',
    })
    @IsEnum(AircraftStatus)
    @IsOptional()
    status?: AircraftStatus;

    @ApiProperty({ example: 389000, description: 'Price in USD' })
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    price: number;

    @ApiProperty({
        example: '1,240 TTAF',
        description: 'Total time airframe hours',
    })
    @IsString()
    @IsNotEmpty()
    hours: string;

    @ApiProperty({
        example: 'KAPA – Denver, CO',
        description: 'Aircraft location',
    })
    @IsString()
    @IsNotEmpty()
    location: string;

    @ApiProperty({
        example: 'Lycoming IO-360',
        description: 'Engine type',
        required: false,
    })
    @IsString()
    @IsOptional()
    engine?: string;

    @ApiProperty({
        example: 'Garmin G1000 NXi',
        description: 'Avionics package',
        required: false,
    })
    @IsString()
    @IsOptional()
    avionics?: string;

    @ApiProperty({
        example: 'https://example.com/aircraft.jpg',
        description: 'Main image URL',
        required: false,
    })
    @IsString()
    @IsOptional()
    imageUrl?: string;

    @ApiProperty({
        example: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        description: 'Additional image URLs',
        required: false,
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @ApiProperty({
        example: 'Detailed description of the aircraft...',
        description: 'Full description',
        required: false,
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: ['IFR Certified', 'Fresh Annual', 'New Paint'],
        description: 'Key features and highlights',
        required: false,
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];

    @ApiProperty({
        example: true,
        description: 'Whether price is negotiable',
    })
    @IsBoolean()
    @IsOptional()
    negotiable?: boolean;

    @ApiProperty({
        example: 'John Doe',
        description: 'Seller/contact name',
        required: false,
    })
    @IsString()
    @IsOptional()
    contactName?: string;

    @ApiProperty({
        example: 'john@example.com',
        description: 'Contact email',
        required: false,
    })
    @IsEmail()
    @IsOptional()
    contactEmail?: string;

    @ApiProperty({
        example: '+1-555-0123',
        description: 'Contact phone',
        required: false,
    })
    @IsString()
    @IsOptional()
    contactPhone?: string;
}
