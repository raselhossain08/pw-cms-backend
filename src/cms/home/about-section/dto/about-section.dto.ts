import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class HighlightDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}

class CTADto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  link: string;
}

class StatDto {
  @ApiProperty()
  @IsNumber()
  value: number;

  @ApiProperty()
  @IsString()
  suffix: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  label: string;
}

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

export class CreateAboutSectionDto {
  @ApiPropertyOptional({ default: 'about' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  subtitle: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiProperty({ type: [HighlightDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightDto)
  highlights: HighlightDto[];

  @ApiProperty({ type: CTADto })
  @ValidateNested()
  @Type(() => CTADto)
  cta: CTADto;

  @ApiPropertyOptional({ type: [StatDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatDto)
  stats?: StatDto[];

  @ApiPropertyOptional({ type: SeoMetaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAboutSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({ type: [HighlightDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HighlightDto)
  highlights?: HighlightDto[];

  @ApiPropertyOptional({ type: CTADto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CTADto)
  cta?: CTADto;

  @ApiPropertyOptional({ type: [StatDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatDto)
  stats?: StatDto[];

  @ApiPropertyOptional({ type: SeoMetaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
