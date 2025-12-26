import { IsObject, IsOptional, IsEnum } from 'class-validator';
import { IntegrationStatus } from '../integrations.entity';

export class IntegrationConfigDto {
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  credentials?: Record<string, any>;

  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;
}
