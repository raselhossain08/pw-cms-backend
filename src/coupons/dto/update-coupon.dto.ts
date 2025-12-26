import { PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateCouponDto extends PartialType(CreateCouponDto) {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'Coupon code must be uppercase alphanumeric with hyphens or underscores only',
  })
  code?: string;
}
