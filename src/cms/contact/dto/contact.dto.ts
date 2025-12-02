import {
  IsString,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

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
  @IsUrl()
  ogImage?: string;

  @IsOptional()
  @IsString()
  ogTitle?: string;

  @IsOptional()
  @IsString()
  ogDescription?: string;

  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;
}

class ContactInfoDto {
  @IsEmail()
  email: string;

  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class ContactFormSectionDto {
  @IsString()
  badge: string;

  @IsString()
  title: string;

  @IsString()
  image: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;
}

class MapSectionDto {
  @IsString()
  embedUrl: string;

  @IsOptional()
  @IsBoolean()
  showMap?: boolean;
}

export class CreateContactDto {
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;

  @ValidateNested()
  @Type(() => ContactFormSectionDto)
  formSection: ContactFormSectionDto;

  @ValidateNested()
  @Type(() => MapSectionDto)
  mapSection: MapSectionDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo?: SeoMetaDto;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}
