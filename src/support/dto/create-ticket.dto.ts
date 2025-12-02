import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
} from 'class-validator';
import { TicketCategory, TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  relatedCourse?: string;

  @IsString()
  @IsOptional()
  relatedOrder?: string;
}
