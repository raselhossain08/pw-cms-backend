// src/modules/footer/dto/update-footer.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsNumber, IsArray, ValidateNested, IsObject, IsUrl, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FooterStatsDto {
  @ApiProperty({ description: 'Statistical value', example: 15000 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Value suffix', example: 'K+' })
  @IsString()
  suffix: string;

  @ApiProperty({ description: 'Label for the statistic', example: 'Active Students' })
  @IsString()
  label: string;
}

export class FooterSocialLinkDto {
  @ApiProperty({ description: 'Social media platform name', example: 'facebook' })
  @IsString()
  platform: string;

  @ApiProperty({ description: 'Social media profile URL', example: 'https://facebook.com/company' })
  @IsUrl()
  href: string;

  @ApiProperty({ description: 'Accessible label for screen readers', example: 'Follow us on Facebook' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Icon identifier', example: 'facebook' })
  @IsString()
  icon: string;
}

export class FooterLinkDto {
  @ApiProperty({ description: 'Link text', example: 'Privacy Policy' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Link URL', example: '/privacy-policy' })
  @IsString()
  href: string;
}

export class FooterSectionDto {
  @ApiProperty({ description: 'Section title', example: 'COMPANY' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Links in this section', type: [FooterLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterLinkDto)
  links: FooterLinkDto[];
}

export class FooterNewsletterDto {
  @ApiProperty({ description: 'Newsletter section title', example: 'GET IN TOUCH' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Newsletter description text', example: 'We dont send spam so dont worry.' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Email input placeholder text', example: 'Email...' })
  @IsString()
  placeholder: string;

  @ApiProperty({ description: 'Subscribe button text', example: 'Subscribe' })
  @IsString()
  buttonText: string;

  @ApiProperty({ description: 'Whether newsletter section is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterContactPhoneDto {
  @ApiProperty({ description: 'Phone number for calling', example: '+1234567890' })
  @IsString()
  number: string;

  @ApiProperty({ description: 'Phone number display format', example: '+1 (234) 567-890' })
  @IsString()
  display: string;

  @ApiProperty({ description: 'Whether phone contact is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterContactEmailDto {
  @ApiProperty({ description: 'Contact email address', example: 'info@company.com' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Whether email contact is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterContactAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Aviation Way, Suite 100' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City', example: 'Sky Harbor' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State/Province', example: 'AZ' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'ZIP/Postal code', example: '85034' })
  @IsString()
  zip: string;

  @ApiProperty({ description: 'Whether address is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterContactHoursDto {
  @ApiProperty({ description: 'Weekday business hours', example: 'Mon - Fri: 8:00 AM - 6:00 PM' })
  @IsString()
  weekday: string;

  @ApiProperty({ description: 'Weekend business hours', example: 'Sat - Sun: 9:00 AM - 4:00 PM' })
  @IsString()
  weekend: string;

  @ApiProperty({ description: 'Whether hours display is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterContactDto {
  @ApiProperty({ description: 'Phone contact information', type: FooterContactPhoneDto })
  @ValidateNested()
  @Type(() => FooterContactPhoneDto)
  phone: FooterContactPhoneDto;

  @ApiProperty({ description: 'Email contact information', type: FooterContactEmailDto })
  @ValidateNested()
  @Type(() => FooterContactEmailDto)
  email: FooterContactEmailDto;

  @ApiProperty({ description: 'Physical address information', type: FooterContactAddressDto })
  @ValidateNested()
  @Type(() => FooterContactAddressDto)
  address: FooterContactAddressDto;

  @ApiProperty({ description: 'Business hours information', type: FooterContactHoursDto })
  @ValidateNested()
  @Type(() => FooterContactHoursDto)
  hours: FooterContactHoursDto;
}

export class FooterLanguageDto {
  @ApiProperty({ description: 'Language code', example: 'en' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Display name of the language', example: 'English' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Flag icon identifier', example: 'us' })
  @IsOptional()
  @IsString()
  flag?: string;
}

export class FooterLogoDto {
  @ApiProperty({ 
    description: 'Logo image URL - should be full upload path like /uploads/images/filename.webp or absolute URL', 
    example: '/uploads/images/1234567890-logo.webp' 
  })
  @IsString()
  src: string;

  @ApiProperty({ description: 'Logo alt text', example: 'Company Logo' })
  @IsString()
  alt: string;

  @ApiProperty({ description: 'Logo width in pixels', example: 140 })
  @IsNumber()
  @Min(1)
  width: number;

  @ApiProperty({ description: 'Logo height in pixels', example: 50 })
  @IsNumber()
  @Min(1)
  height: number;
}

export class FooterSocialMediaDto {
  @ApiProperty({ description: 'Social media section title', example: 'Follow us on social media' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Whether social media section is enabled', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Social media links', type: [FooterSocialLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterSocialLinkDto)
  links: FooterSocialLinkDto[];
}

export class FooterLanguageSelectorDto {
  @ApiProperty({ description: 'Whether language selector is enabled', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Current active language', example: 'English' })
  @IsString()
  currentLanguage: string;

  @ApiProperty({ description: 'Available languages', type: [FooterLanguageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterLanguageDto)
  languages: FooterLanguageDto[];
}

export class FooterCopyrightDto {
  @ApiProperty({ description: 'Copyright start year', example: 1991 })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  startYear: number;

  @ApiProperty({ description: 'Company name', example: 'Personal Wings, Inc.' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Rights reserved text', example: 'All Rights Reserved' })
  @IsString()
  rightsText: string;

  @ApiPropertyOptional({ description: 'Optional contact link' })
  @IsOptional()
  @IsObject()
  contactLink?: {
    text: string;
    href: string;
  };
}

export class FooterDescriptionDto {
  @ApiProperty({ description: 'Footer description text', example: 'Into flight simulators? Our friends at Pro Desk Sim have multiple aircraft available for you!' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Whether description is enabled', example: true })
  @IsBoolean()
  enabled: boolean;
}

export class FooterStylingDto {
  @ApiProperty({ description: 'Background color', example: '#1a1a1a' })
  @IsString()
  backgroundColor: string;

  @ApiProperty({ description: 'Text color', example: '#ffffff' })
  @IsString()
  textColor: string;

  @ApiProperty({ description: 'Accent color for links and highlights', example: '#3b82f6' })
  @IsString()
  accentColor: string;

  @ApiProperty({ description: 'Border color', example: '#374151' })
  @IsString()
  borderColor: string;

  @ApiProperty({ description: 'Top padding in pixels', example: 80 })
  @IsNumber()
  @Min(0)
  paddingTop: number;

  @ApiProperty({ description: 'Bottom padding in pixels', example: 48 })
  @IsNumber()
  @Min(0)
  paddingBottom: number;
}

export class FooterSEOAccessibilityDto {
  @ApiProperty({ description: 'ARIA labels for accessibility' })
  @IsObject()
  ariaLabels: {
    footer: string;
    socialLinks: string;
    newsletter: string;
    sections: string;
    bottomLinks: string;
  };
}

export class FooterSEODto {
  @ApiPropertyOptional({ description: 'JSON-LD structured data' })
  @IsOptional()
  @IsObject()
  footerSchema?: any;

  @ApiProperty({ description: 'Accessibility configuration', type: FooterSEOAccessibilityDto })
  @ValidateNested()
  @Type(() => FooterSEOAccessibilityDto)
  accessibility: FooterSEOAccessibilityDto;
}

export class UpdateFooterDto {
  @ApiPropertyOptional({ description: 'Whether footer is enabled and visible', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Footer logo configuration', type: FooterLogoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterLogoDto)
  logo?: FooterLogoDto;

  @ApiPropertyOptional({ description: 'Footer description', type: FooterDescriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterDescriptionDto)
  description?: FooterDescriptionDto;

  @ApiPropertyOptional({ description: 'Social media configuration', type: FooterSocialMediaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterSocialMediaDto)
  socialMedia?: FooterSocialMediaDto;

  @ApiPropertyOptional({ description: 'Footer link sections', type: [FooterSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterSectionDto)
  sections?: FooterSectionDto[];

  @ApiPropertyOptional({ description: 'Newsletter subscription section', type: FooterNewsletterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterNewsletterDto)
  newsletter?: FooterNewsletterDto;

  @ApiPropertyOptional({ description: 'Contact information', type: FooterContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterContactDto)
  contact?: FooterContactDto;

  @ApiPropertyOptional({ description: 'Bottom footer links', type: [FooterLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterLinkDto)
  bottomLinks?: FooterLinkDto[];

  @ApiPropertyOptional({ description: 'Language selector configuration', type: FooterLanguageSelectorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterLanguageSelectorDto)
  languageSelector?: FooterLanguageSelectorDto;

  @ApiPropertyOptional({ description: 'Copyright information', type: FooterCopyrightDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterCopyrightDto)
  copyright?: FooterCopyrightDto;

  @ApiPropertyOptional({ description: 'Optional statistics section', type: [FooterStatsDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterStatsDto)
  stats?: FooterStatsDto[];

  @ApiPropertyOptional({ description: 'Footer styling configuration', type: FooterStylingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterStylingDto)
  styling?: FooterStylingDto;

  @ApiPropertyOptional({ description: 'SEO and accessibility configuration', type: FooterSEODto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FooterSEODto)
  seo?: FooterSEODto;
}