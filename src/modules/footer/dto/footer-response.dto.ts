// src/modules/footer/dto/footer-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FooterLogoDto,
  FooterDescriptionDto,
  FooterSocialMediaDto,
  FooterSectionDto,
  FooterNewsletterDto,
  FooterContactDto,
  FooterLanguageSelectorDto,
  FooterCopyrightDto,
  FooterStatsDto,
  FooterStylingDto,
  FooterSEODto,
  FooterLinkDto
} from './update-footer.dto';

export class FooterResponseDto {
  @ApiProperty({ description: 'Footer ID', example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ description: 'Whether footer is enabled and visible', example: true })
  enabled: boolean;

  @ApiProperty({ description: 'Footer logo configuration', type: FooterLogoDto })
  logo: FooterLogoDto;

  @ApiProperty({ description: 'Footer description', type: FooterDescriptionDto })
  description: FooterDescriptionDto;

  @ApiProperty({ description: 'Social media configuration', type: FooterSocialMediaDto })
  socialMedia: FooterSocialMediaDto;

  @ApiProperty({ description: 'Footer link sections', type: [FooterSectionDto] })
  sections: FooterSectionDto[];

  @ApiProperty({ description: 'Newsletter subscription section', type: FooterNewsletterDto })
  newsletter: FooterNewsletterDto;

  @ApiProperty({ description: 'Contact information', type: FooterContactDto })
  contact: FooterContactDto;

  @ApiProperty({ description: 'Bottom footer links', type: [FooterLinkDto] })
  bottomLinks: FooterLinkDto[];

  @ApiProperty({ description: 'Language selector configuration', type: FooterLanguageSelectorDto })
  languageSelector: FooterLanguageSelectorDto;

  @ApiProperty({ description: 'Copyright information', type: FooterCopyrightDto })
  copyright: FooterCopyrightDto;

  @ApiPropertyOptional({ description: 'Optional statistics section', type: [FooterStatsDto] })
  stats?: FooterStatsDto[];

  @ApiProperty({ description: 'Footer styling configuration', type: FooterStylingDto })
  styling: FooterStylingDto;

  @ApiProperty({ description: 'SEO and accessibility configuration', type: FooterSEODto })
  seo: FooterSEODto;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}