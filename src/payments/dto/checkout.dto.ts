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
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../orders/entities/order.entity';

export class CheckoutDto {
  @ApiProperty({
    type: [Object],
    description: 'Cart items',
    example: [
      { courseId: 'course-id-1', quantity: 1, price: 99.99 },
      { productId: 'product-id-1', quantity: 2, price: 49.99 },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  cartItems: Array<{
    courseId?: string;
    productId?: string;
    quantity: number;
    price: number;
  }>;

  @ApiProperty({ example: 199.99 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  total: number;

  @ApiProperty({ example: 179.99 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'DISCOUNT20', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  billingAddress?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiProperty({
    example: false,
    description: 'Use test/mock payment (for development)',
    required: false,
  })
  @IsOptional()
  useTestMode?: boolean;
}
