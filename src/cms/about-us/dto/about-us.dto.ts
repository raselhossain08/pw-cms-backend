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
import { PartialType } from '@nestjs/mapped-types';

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

export class ContentSectionDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsString()
  content: string; // HTML content

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
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

export class TeamMemberDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  certifications?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class TeamSectionDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members?: TeamMemberDto[];
}

export class StatDto {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class StatsSectionDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatDto)
  stats?: StatDto[];
}

export class CreateAboutUsDto {
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection: HeaderSectionDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentSectionDto)
  sections: ContentSectionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TeamSectionDto)
  teamSection?: TeamSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StatsSectionDto)
  statsSection?: StatsSectionDto;

  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo: SeoMetaDto;
}

export class UpdateAboutUsDto extends PartialType(CreateAboutUsDto) { }
