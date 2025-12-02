import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class SeoMetaDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;
}

class HeaderSectionDto {
  @IsString()
  badge: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;
}

class CategoryDto {
  @IsString()
  name: string;

  @IsString()
  icon: string;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsString()
  color: string;
}

class FaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateFaqsDto {
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection: HeaderSectionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs?: FaqItemDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;
}

export class UpdateFaqsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection?: HeaderSectionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories?: CategoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs?: FaqItemDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;
}
