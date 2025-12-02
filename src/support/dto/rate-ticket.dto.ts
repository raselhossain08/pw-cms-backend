import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class RateTicketDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
