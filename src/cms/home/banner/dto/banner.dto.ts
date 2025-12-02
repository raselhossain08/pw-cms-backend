import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SeoMetaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  ogImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;
}

export class CreateBannerDto {
  @ApiProperty({ description: 'Banner title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Banner description' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @ApiProperty({ description: 'Image alt text' })
  @IsNotEmpty()
  @IsString()
  alt: string;

  @ApiProperty({ description: 'Call-to-action link' })
  @IsNotEmpty()
  @IsString()
  link: string;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'SEO metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;
}

export class UpdateBannerDto {
  @ApiPropertyOptional({ description: 'Banner title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Banner description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Video URL' })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsOptional()
  @IsUrl()
  thumbnail?: string;

  @ApiPropertyOptional({ description: 'Image alt text' })
  @IsOptional()
  @IsString()
  alt?: string;

  @ApiPropertyOptional({ description: 'Call-to-action link' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'SEO metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;
}
