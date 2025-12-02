import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class MarkAttendanceDto {
  @IsString()
  sessionId: string;

  @IsBoolean()
  @IsOptional()
  present?: boolean;

  @IsNumber()
  @IsOptional()
  duration?: number;
}
