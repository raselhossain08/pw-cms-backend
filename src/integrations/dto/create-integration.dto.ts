import {
    IsString,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsObject,
    IsArray,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrationCategory, IntegrationStatus } from '../integrations.entity';

class StatDto {
    @IsString()
    label: string;

    @IsString()
    value: string;
}

export class CreateIntegrationDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsEnum(IntegrationCategory)
    category: IntegrationCategory;

    @IsString()
    description: string;

    @IsEnum(IntegrationStatus)
    @IsOptional()
    status?: IntegrationStatus;

    @IsString()
    @IsOptional()
    logo?: string;

    @IsObject()
    @IsOptional()
    config?: Record<string, any>;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => StatDto)
    @IsOptional()
    stats?: StatDto[];

    @IsObject()
    @IsOptional()
    credentials?: Record<string, any>;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsNumber()
    @IsOptional()
    sortOrder?: number;
}
