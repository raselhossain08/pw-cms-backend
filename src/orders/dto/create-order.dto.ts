import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderDto {
  @ApiProperty({ type: String, description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ type: [String], description: 'Course IDs' })
  @IsArray()
  @IsNotEmpty()
  courses: string[];

  @ApiProperty({ example: 2999.99, description: 'Subtotal amount' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({ example: 299.99, description: 'Tax amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @ApiProperty({ example: 0, description: 'Discount amount', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: 3299.98, description: 'Total amount' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  total: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({
    type: Object,
    description: 'Billing address',
    required: false,
  })
  @IsObject()
  @IsOptional()
  billingAddress?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };

  @ApiProperty({
    example: 'affiliate_123',
    description: 'Affiliate ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  affiliate?: string;

  @ApiProperty({
    example: 100,
    description: 'Affiliate commission',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  affiliateCommission?: number;
}
