import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  Min,
  IsObject,
} from 'class-validator';
import {
  ProductType,
  ProductStatus,
  AircraftCategory,
} from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Cessna 172 Skyhawk', description: 'Product title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'cessna-172-skyhawk', description: 'Product slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'Well-maintained Cessna 172...',
    description: 'Product description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    enum: ProductType,
    example: ProductType.AIRCRAFT,
    description: 'Product type',
  })
  @IsEnum(ProductType)
  @IsNotEmpty()
  type: ProductType;

  @ApiProperty({
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
    description: 'Product status',
  })
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @ApiProperty({ example: 250000, description: 'Product price' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiProperty({ example: 'USD', description: 'Currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    enum: AircraftCategory,
    example: AircraftCategory.SINGLE_ENGINE,
    description: 'Aircraft category',
    required: false,
  })
  @IsEnum(AircraftCategory)
  @IsOptional()
  aircraftCategory?: AircraftCategory;

  @ApiProperty({
    example: 'Cessna',
    description: 'Manufacturer',
    required: false,
  })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiProperty({
    example: '172 Skyhawk',
    description: 'Model',
    required: false,
  })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    example: 1978,
    description: 'Year of manufacture',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({
    example: 1200,
    description: 'Total time on airframe',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  totalTime?: number;

  @ApiProperty({
    example: ['IFR', 'GPS', 'Autopilot'],
    description: 'Features',
    required: false,
  })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiProperty({
    example: 'KAPA',
    description: 'Location airport code',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ type: [String], description: 'Image URLs', required: false })
  @IsArray()
  @IsOptional()
  images?: string[];

  @ApiProperty({
    example: true,
    description: 'Featured product flag',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({
    example: ['single_engine', 'ifr_capable'],
    description: 'Product tags',
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 1, description: 'Quantity available' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ type: Object, description: 'Specifications', required: false })
  @IsObject()
  @IsOptional()
  specifications?: {
    seats: number;
    cruiseSpeed: number;
    range: number;
    fuelCapacity: number;
    maxTakeoffWeight: number;
    usefulLoad: number;
  };

  @ApiProperty({
    type: Object,
    description: 'Maintenance information',
    required: false,
  })
  @IsObject()
  @IsOptional()
  maintenance?: {
    lastAnnual: Date;
    nextAnnual: Date;
    last100Hour: Date;
    next100Hour: Date;
    damageHistory: boolean;
    damageDescription: string;
  };
}
