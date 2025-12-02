import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
} from 'class-validator';
import { ConfigCategory } from '../entities/system-config.entity';

export class CreateConfigDto {
  @IsString()
  @MinLength(1)
  key: string;

  @IsString()
  value: string;

  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @IsString()
  @MinLength(1)
  label: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsString()
  @IsOptional()
  placeholder?: string;
}

export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkUpdateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}
