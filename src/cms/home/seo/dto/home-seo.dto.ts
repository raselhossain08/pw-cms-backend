import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateHomeSEODto {
    @ApiProperty({ example: 'Home - Your Learning Platform' })
    @IsString()
    title: string;

    @ApiProperty({ example: 'Welcome to our learning platform. Discover courses, enhance your skills.' })
    @IsString()
    description: string;

    @ApiProperty({ example: ['learning', 'courses', 'education', 'training'] })
    @IsArray()
    @IsString({ each: true })
    keywords: string[];

    @ApiProperty({ required: false, example: 'Home - Your Learning Platform' })
    @IsOptional()
    @IsString()
    ogTitle?: string;

    @ApiProperty({ required: false, example: 'Discover amazing courses' })
    @IsOptional()
    @IsString()
    ogDescription?: string;

    @ApiProperty({ required: false, example: 'https://example.com/og-image.jpg' })
    @IsOptional()
    @IsString()
    ogImage?: string;

    @ApiProperty({ required: false, example: 'summary_large_image' })
    @IsOptional()
    @IsString()
    twitterCard?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterTitle?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterDescription?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterImage?: string;

    @ApiProperty({ required: false, example: 'https://example.com/' })
    @IsOptional()
    @IsString()
    canonical?: string;

    @ApiProperty({ required: false, example: 'index, follow' })
    @IsOptional()
    @IsString()
    robots?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    author?: string;

    @ApiProperty({ required: false, example: 'en_US' })
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    siteName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    structuredData?: any;

    @ApiProperty({ required: false, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateHomeSEODto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    keywords?: string[];

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    ogTitle?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    ogDescription?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    ogImage?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterCard?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterTitle?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterDescription?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    twitterImage?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    canonical?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    robots?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    author?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    siteName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    structuredData?: any;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
