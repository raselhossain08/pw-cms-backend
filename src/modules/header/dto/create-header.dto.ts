// src/modules/header/dto/create-header.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // ✅ Swagger properties
import { IsBoolean, IsObject, IsOptional } from 'class-validator';

export class CreateHeaderDto {
    @ApiProperty({
        description: 'Whether the header is enabled',
        default: true,
        example: true
    })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiProperty({
        description: 'Header logo configuration',
        example: {
            dark: "",
            light: "",
            alt: "Personal Wings Logo"
        }
    })
    @IsObject()
    logo: any;

    @ApiPropertyOptional({
        description: 'Shopping cart configuration',
        example: {
            itemCount: 4,
            href: "/cart",
            items: []
        }
    })
    @IsObject()
    @IsOptional()
    cart?: any;

    @ApiPropertyOptional({ description: 'Top bar configuration' })
    @IsObject()
    @IsOptional()
    topBar?: any;
}