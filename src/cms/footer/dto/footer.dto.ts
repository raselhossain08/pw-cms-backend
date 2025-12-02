import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LogoDto {
  @ApiProperty({ example: '/footer-logo.webp' })
  @IsString()
  @IsNotEmpty()
  src: string;

  @ApiProperty({ example: 'Personal Wings Logo' })
  @IsString()
  @IsNotEmpty()
  alt: string;

  @ApiProperty({ example: 140 })
  @IsNumber()
  width: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  height: number;
}

class SocialLinkDto {
  @ApiProperty({ example: 'facebook' })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'https://facebook.com' })
  @IsUrl()
  href: string;

  @ApiProperty({ example: 'Follow us on Facebook' })
  @IsString()
  label: string;
}

class SocialMediaDto {
  @ApiProperty({ example: 'Follow us on social media' })
  @IsString()
  title: string;

  @ApiProperty({ type: [SocialLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  links: SocialLinkDto[];
}

class SectionLinkDto {
  @ApiProperty({ example: 'All Courses' })
  @IsString()
  label: string;

  @ApiProperty({ example: '/course' })
  @IsString()
  href: string;
}

class SectionDto {
  @ApiProperty({ example: 'LEARNING' })
  @IsString()
  title: string;

  @ApiProperty({ type: [SectionLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionLinkDto)
  links: SectionLinkDto[];
}

class NewsletterDto {
  @ApiProperty({ example: 'GET IN TOUCH' })
  @IsString()
  title: string;

  @ApiProperty({ example: "We don't send spam so don't worry." })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Email...' })
  @IsString()
  placeholder: string;

  @ApiProperty({ example: 'Subscribe' })
  @IsString()
  buttonText: string;
}

class BottomLinkDto {
  @ApiProperty({ example: 'FAQs' })
  @IsString()
  label: string;

  @ApiProperty({ example: '/faqs' })
  @IsString()
  href: string;
}

class LanguageDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  name: string;
}

class LanguageSelectorDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  currentLanguage: string;

  @ApiProperty({ type: [LanguageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];
}

class ContactInfoDto {
  @ApiProperty({ example: '+1 (234) 567-890' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'tel:+1234567890' })
  @IsString()
  phoneHref: string;

  @ApiProperty({ example: 'info@personalwings.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'mailto:info@personalwings.com' })
  @IsString()
  emailHref: string;

  @ApiProperty({ example: '123 Aviation Way, Suite 100 Sky Harbor, AZ 85034' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Mon - Fri: 8:00 AM - 6:00 PM' })
  @IsString()
  hours: string;
}

class CompanyInfoDto {
  @ApiProperty({
    example:
      'Into flight simulators? Our friends at Pro Desk Sim have multiple aircraft available for you!',
  })
  @IsString()
  description: string;

  @ApiProperty({ example: '1991' })
  @IsString()
  foundedYear: string;

  @ApiProperty({ example: 'Personal Wings, Inc.' })
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'All Rights Reserved' })
  @IsString()
  rightsText: string;

  @ApiProperty({ example: '/contact' })
  @IsString()
  contactLink: string;
}

export class CreateFooterDto {
  @ApiProperty({ type: LogoDto })
  @ValidateNested()
  @Type(() => LogoDto)
  logo: LogoDto;

  @ApiProperty({ type: SocialMediaDto })
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia: SocialMediaDto;

  @ApiProperty({ type: [SectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];

  @ApiProperty({ type: NewsletterDto })
  @ValidateNested()
  @Type(() => NewsletterDto)
  newsletter: NewsletterDto;

  @ApiProperty({ type: [BottomLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BottomLinkDto)
  bottomLinks: BottomLinkDto[];

  @ApiProperty({ type: LanguageSelectorDto })
  @ValidateNested()
  @Type(() => LanguageSelectorDto)
  languageSelector: LanguageSelectorDto;

  @ApiProperty({ type: ContactInfoDto })
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact: ContactInfoDto;

  @ApiProperty({ type: CompanyInfoDto })
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  companyInfo: CompanyInfoDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFooterDto {
  @ApiPropertyOptional({ type: LogoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LogoDto)
  logo?: LogoDto;

  @ApiPropertyOptional({ type: SocialMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto;

  @ApiPropertyOptional({ type: [SectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections?: SectionDto[];

  @ApiPropertyOptional({ type: NewsletterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NewsletterDto)
  newsletter?: NewsletterDto;

  @ApiPropertyOptional({ type: [BottomLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BottomLinkDto)
  bottomLinks?: BottomLinkDto[];

  @ApiPropertyOptional({ type: LanguageSelectorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LanguageSelectorDto)
  languageSelector?: LanguageSelectorDto;

  @ApiPropertyOptional({ type: ContactInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contact?: ContactInfoDto;

  @ApiPropertyOptional({ type: CompanyInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyInfoDto)
  companyInfo?: CompanyInfoDto;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
