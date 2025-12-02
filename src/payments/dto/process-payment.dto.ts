import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '../../orders/entities/order.entity';

export class ProcessPaymentDto {
  @ApiProperty({ example: 'pi_1234567890', description: 'Payment intent ID' })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.STRIPE,
    description: 'Payment method used',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: 'pm_1234567890',
    description: 'Payment method ID from Stripe/PayPal',
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({
    example: 'order_12345',
    description: 'Order ID to process payment for',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'ORD-2024-001', description: 'Order number' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiProperty({
    example: 'Additional notes',
    description: 'Optional payment notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
