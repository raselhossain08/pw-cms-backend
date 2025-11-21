import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateLogoDto {
    @ApiProperty({
        description: 'Dark mode logo URL',
        example: '/logo-dark.svg'
    })
    @IsString()
    @IsNotEmpty()
    dark: string;

    @ApiProperty({
        description: 'Light mode logo URL',
        example: '/logo-light.svg'
    })
    @IsString()
    @IsNotEmpty()
    light: string;

    @ApiProperty({
        description: 'Logo alt text',
        example: 'Company Logo'
    })
    @IsString()
    @IsNotEmpty()
    alt: string;
}
