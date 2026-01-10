import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  Matches,
  MinLength,
  MaxLength,
  IsDateString,
  ValidateIf,
  IsDate,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CouponType } from '../entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty({
    example: 'SUMMER25',
    description: 'Unique coupon code (uppercase, alphanumeric)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'Coupon code must be uppercase alphanumeric with hyphens or underscores only',
  })
  code: string;

  @ApiProperty({
    enum: CouponType,
    example: CouponType.PERCENTAGE,
    description: 'Discount type',
  })
  @IsEnum(CouponType)
  @IsNotEmpty()
  type: CouponType;

  @ApiProperty({
    example: 25,
    description: 'Discount value (percentage or fixed amount)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  value: number;

  @ApiProperty({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Expiration date in ISO 8601 format (optional). If not provided, the coupon will not expire. Timezone: UTC',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o) => o.expiresAt !== undefined && o.expiresAt !== null && o.expiresAt !== '')
  @Transform(({ value }) => {
    // Handle empty string, null, undefined, or empty object by converting to undefined
    if (!value || value === '' || value === null || value === undefined ||
      (typeof value === 'object' && Object.keys(value).length === 0)) {
      return undefined;
    }

    // If it's already a Date object, return ISO string
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value.toISOString();
    }

    // Try to parse the date string
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      // Return invalid value to let validation catch it
      return value;
    }

    // Return as ISO string for consistency
    return date.toISOString();
  }, { toClassOnly: true })
  @IsDateString({}, {
    message: 'Expiration date must be a valid ISO 8601 date string (e.g., 2024-12-31T23:59:59.000Z)'
  })
  expiresAt?: string;

  // These fields should not be set by client - they're managed by timestamps
  // Transform removes any values sent from frontend to prevent manipulation
  @IsOptional()
  @Transform(() => undefined, { toClassOnly: true })
  createdAt?: any;

  @IsOptional()
  @Transform(() => undefined, { toClassOnly: true })
  updatedAt?: any;

  @ApiProperty({
    example: 100,
    description: 'Maximum number of uses (0 = unlimited)',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxUses?: number;

  @ApiProperty({
    example: 50,
    description: 'Minimum purchase amount required',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPurchaseAmount?: number;

  @ApiProperty({
    example: true,
    description: 'Whether coupon is active',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
