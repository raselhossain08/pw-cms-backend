import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RefundStatus } from '../entities/refund.entity';

export class ReviewRefundDto {
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
