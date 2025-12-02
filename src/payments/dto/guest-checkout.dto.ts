import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '../../orders/entities/order.entity';

export class GuestCheckoutDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: ['course-id-1', 'course-id-2'] })
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
  @IsNotEmpty()
  total: number;

  @ApiProperty({ example: 179.99 })
  @IsNumber()
  @IsNotEmpty()
  subtotal: number;

  @ApiProperty({ example: 'stripe', enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'DISCOUNT20', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  billingAddress?: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}
