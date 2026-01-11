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
} from 'class-validator';
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
    description: 'Expiration date (optional)',
    required: false,
  })
  @IsOptional()
  expiresAt?: Date;

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
