import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseEnrollmentDto {
  @ApiProperty({ description: 'Course ID' })
  @IsString()
  courseId: string;

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Amount paid' })
  @IsNumber()
  amountPaid: number;

  @ApiProperty({ enum: ['stripe', 'paypal', 'bank_transfer', 'credit_card'] })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'Transaction ID from payment gateway' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Payment status' })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'failed', 'refunded'])
  paymentStatus?: string;
}

export class VerifyPurchaseDto {
  @ApiProperty({ description: 'Payment session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Course IDs purchased' })
  @IsString({ each: true })
  courseIds: string[];
}

export class UpdateAccessDto {
  @ApiProperty({ description: 'Whether user has access' })
  @IsBoolean()
  hasAccess: boolean;

  @ApiPropertyOptional({ description: 'Reason for access change' })
  @IsOptional()
  @IsString()
  reason?: string;
}
