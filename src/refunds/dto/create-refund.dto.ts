import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { RefundReason } from '../entities/refund.entity';

export class CreateRefundDto {
  @IsString()
  orderId: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsNumber()
  amount: number;

  @IsEnum(RefundReason)
  reason: RefundReason;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
