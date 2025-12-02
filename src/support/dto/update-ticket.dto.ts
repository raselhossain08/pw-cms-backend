import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TicketStatus, TicketPriority } from '../entities/ticket.entity';

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
}
