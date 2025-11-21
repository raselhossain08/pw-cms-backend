import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateFooterLogoDto {
    @ApiProperty({
        description: 'Logo image URL - should be full upload path like /uploads/images/filename.webp or absolute URL',
        example: '/uploads/images/1234567890-footer-logo.webp'
    })
    @IsString()
    @IsNotEmpty()
    src: string;

    @ApiProperty({
        description: 'Logo alt text for accessibility',
        example: 'Company Footer Logo'
    })
    @IsString()
    @IsNotEmpty()
    alt: string;

    @ApiProperty({
        description: 'Logo width in pixels',
        example: 140
    })
    @IsNumber()
    @Min(1)
    width: number;

    @ApiProperty({
        description: 'Logo height in pixels',
        example: 50
    })
    @IsNumber()
    @Min(1)
    height: number;
}
