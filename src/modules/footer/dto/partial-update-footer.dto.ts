// src/modules/footer/dto/partial-update-footer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  FooterLogoDto,
  FooterSocialMediaDto,
  FooterSectionDto,
  FooterNewsletterDto,
  FooterContactDto,
  FooterCopyrightDto,
  FooterStylingDto,
  FooterSEODto,
  FooterLinkDto
} from './update-footer.dto';

export class UpdateFooterLogoDto {
  @ApiProperty({ description: 'Footer logo configuration', type: FooterLogoDto })
  @ValidateNested()
  @Type(() => FooterLogoDto)
  logo: FooterLogoDto;
}

export class UpdateFooterSocialMediaDto {
  @ApiProperty({ description: 'Social media configuration', type: FooterSocialMediaDto })
  @ValidateNested()
  @Type(() => FooterSocialMediaDto)
  socialMedia: FooterSocialMediaDto;
}

export class UpdateFooterSectionsDto {
  @ApiProperty({ description: 'Footer link sections', type: [FooterSectionDto] })
  @ValidateNested({ each: true })
  @Type(() => FooterSectionDto)
  sections: FooterSectionDto[];
}

export class UpdateFooterNewsletterDto {
  @ApiProperty({ description: 'Newsletter subscription section', type: FooterNewsletterDto })
  @ValidateNested()
  @Type(() => FooterNewsletterDto)
  newsletter: FooterNewsletterDto;
}

export class UpdateFooterContactDto {
  @ApiProperty({ description: 'Contact information', type: FooterContactDto })
  @ValidateNested()
  @Type(() => FooterContactDto)
  contact: FooterContactDto;
}

export class UpdateFooterBottomLinksDto {
  @ApiProperty({ description: 'Bottom footer links', type: [FooterLinkDto] })
  @ValidateNested({ each: true })
  @Type(() => FooterLinkDto)
  bottomLinks: FooterLinkDto[];
}

export class UpdateFooterCopyrightDto {
  @ApiProperty({ description: 'Copyright information', type: FooterCopyrightDto })
  @ValidateNested()
  @Type(() => FooterCopyrightDto)
  copyright: FooterCopyrightDto;
}

export class UpdateFooterStylingDto {
  @ApiProperty({ description: 'Footer styling configuration', type: FooterStylingDto })
  @ValidateNested()
  @Type(() => FooterStylingDto)
  styling: FooterStylingDto;
}

export class UpdateFooterSEODto {
  @ApiProperty({ description: 'SEO and accessibility configuration', type: FooterSEODto })
  @ValidateNested()
  @Type(() => FooterSEODto)
  seo: FooterSEODto;
}