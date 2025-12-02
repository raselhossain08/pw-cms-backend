import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HeaderSectionDto {
  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  imageAlt?: string;
}

export class SubSectionDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  content: string[];
}

export class PolicySectionDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  content: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubSectionDto)
  @IsOptional()
  subsections?: SubSectionDto[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class ContactInfoDto {
  @IsString()
  refundDepartment: string;

  @IsString()
  generalSupport: string;

  @IsString()
  phone: string;

  @IsString()
  businessHours: string;

  @IsString()
  address: string;
}

export class SeoMetaDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  keywords: string[];

  @IsString()
  @IsOptional()
  ogTitle?: string;

  @IsString()
  @IsOptional()
  ogDescription?: string;

  @IsString()
  @IsOptional()
  ogImage?: string;

  @IsString()
  @IsOptional()
  canonicalUrl?: string;
}

export class CreateRefundPolicyDto {
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  headerSection: HeaderSectionDto;

  @IsString()
  lastUpdated: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicySectionDto)
  sections: PolicySectionDto[];

  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo: ContactInfoDto;

  @ValidateNested()
  @Type(() => SeoMetaDto)
  seoMeta: SeoMetaDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRefundPolicyDto {
  @ValidateNested()
  @Type(() => HeaderSectionDto)
  @IsOptional()
  headerSection?: HeaderSectionDto;

  @IsString()
  @IsOptional()
  lastUpdated?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicySectionDto)
  @IsOptional()
  sections?: PolicySectionDto[];

  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsOptional()
  contactInfo?: ContactInfoDto;

  @ValidateNested()
  @Type(() => SeoMetaDto)
  @IsOptional()
  seoMeta?: SeoMetaDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
