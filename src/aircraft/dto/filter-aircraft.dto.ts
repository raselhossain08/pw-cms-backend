import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AircraftType, AircraftStatus } from '../entities/aircraft.entity';

export class FilterAircraftDto {
    @ApiPropertyOptional({
        enum: AircraftType,
        description: 'Filter by aircraft type',
    })
    @IsEnum(AircraftType)
    @IsOptional()
    type?: AircraftType;

    @ApiPropertyOptional({
        enum: AircraftStatus,
        description: 'Filter by status',
    })
    @IsEnum(AircraftStatus)
    @IsOptional()
    status?: AircraftStatus;

    @ApiPropertyOptional({
        description: 'Search query for title, manufacturer, location',
    })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({
        description: 'Minimum price',
    })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    minPrice?: number;

    @ApiPropertyOptional({
        description: 'Maximum price',
    })
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    @IsOptional()
    maxPrice?: number;

    @ApiPropertyOptional({
        description: 'Page number',
        default: 1,
    })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Items per page',
        default: 10,
    })
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    @IsOptional()
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Sort by field',
        default: 'createdAt',
    })
    @IsString()
    @IsOptional()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        description: 'Sort order (asc or desc)',
        default: 'desc',
    })
    @IsString()
    @IsOptional()
    sortOrder?: 'asc' | 'desc' = 'desc';
}
