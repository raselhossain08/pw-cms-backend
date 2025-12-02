import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '../../orders/entities/order.entity';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 2999.99, description: 'Payment amount' })
  @IsNumber()
  @Min(0.5) // Minimum Stripe amount
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'usd', description: 'Currency' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: ['course_123'],
    description: 'Course IDs',
    required: false,
  })
  @IsArray()
  @IsOptional()
  courseIds?: string[];

  @ApiProperty({
    example: 'Premium subscription',
    description: 'Payment description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'cus_123',
    description: 'Customer ID for saved payment methods',
    required: false,
  })
  @IsString()
  @IsOptional()
  customerId?: string;
}
