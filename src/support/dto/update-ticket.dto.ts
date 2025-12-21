import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TicketStatus, TicketPriority, TicketCategory } from '../entities/ticket.entity';

export class UpdateTicketDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketCategory)
  @IsOptional()
  category?: TicketCategory;
}
