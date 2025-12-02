import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HeaderSectionDto {
  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;
}

export class SubSectionDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  content: string[];
}

export class TermsSectionDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  content: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubSectionDto)
  subsections?: SubSectionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNumber()
  order: number;
}

export class ContactInfoDto {
  @IsString()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;
}

export class SeoMetaDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;

  @IsOptional()
  @IsString()
  ogImage?: string;

  @IsOptional()
  @IsString()
  canonicalUrl?: string;
}

export class CreateTermsConditionsDto {
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection: HeaderSectionDto;

  @IsString()
  lastUpdated: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermsSectionDto)
  @ArrayMinSize(1)
  sections: TermsSectionDto[];

  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;

  @ValidateNested()
  @Type(() => SeoMetaDto)
  seoMeta: SeoMetaDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTermsConditionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection?: HeaderSectionDto;

  @IsOptional()
  @IsString()
  lastUpdated?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TermsSectionDto)
  sections?: TermsSectionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seoMeta?: SeoMetaDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
