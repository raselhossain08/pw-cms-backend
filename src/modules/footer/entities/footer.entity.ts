// src/modules/footer/entities/footer.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class FooterStats {
  @ApiProperty({ description: 'Statistical value' })
  @Prop({ required: true })
  value: number;

  @ApiProperty({ description: 'Value suffix (e.g., K+, %, etc.)' })
  @Prop({ required: true })
  suffix: string;

  @ApiProperty({ description: 'Label for the statistic' })
  @Prop({ required: true })
  label: string;
}

@Schema()
export class FooterSocialLink {
  @ApiProperty({ description: 'Social media platform name' })
  @Prop({ required: true })
  platform: string;

  @ApiProperty({ description: 'Social media profile URL' })
  @Prop({ required: true })
  href: string;

  @ApiProperty({ description: 'Accessible label for screen readers' })
  @Prop({ required: true })
  label: string;

  @ApiProperty({ description: 'Icon identifier' })
  @Prop({ required: true })
  icon: string;
}

@Schema()
export class FooterLink {
  @ApiProperty({ description: 'Link text' })
  @Prop({ required: true })
  label: string;

  @ApiProperty({ description: 'Link URL' })
  @Prop({ required: true })
  href: string;
}

@Schema()
export class FooterSection {
  @ApiProperty({ description: 'Section title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: 'Links in this section', type: [FooterLink] })
  @Prop({ type: [FooterLink], required: true })
  links: FooterLink[];
}

@Schema()
export class FooterNewsletter {
  @ApiProperty({ description: 'Newsletter section title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: 'Newsletter description text' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ description: 'Email input placeholder text' })
  @Prop({ required: true })
  placeholder: string;

  @ApiProperty({ description: 'Subscribe button text' })
  @Prop({ required: true })
  buttonText: string;

  @ApiProperty({ description: 'Whether newsletter section is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterContactPhone {
  @ApiProperty({ description: 'Phone number for calling' })
  @Prop({ required: true })
  number: string;

  @ApiProperty({ description: 'Phone number display format' })
  @Prop({ required: true })
  display: string;

  @ApiProperty({ description: 'Whether phone contact is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterContactEmail {
  @ApiProperty({ description: 'Contact email address' })
  @Prop({ required: true })
  address: string;

  @ApiProperty({ description: 'Whether email contact is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterContactAddress {
  @ApiProperty({ description: 'Street address' })
  @Prop({ required: true })
  street: string;

  @ApiProperty({ description: 'City' })
  @Prop({ required: true })
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @Prop({ required: true })
  state: string;

  @ApiProperty({ description: 'ZIP/Postal code' })
  @Prop({ required: true })
  zip: string;

  @ApiProperty({ description: 'Whether address is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterContactHours {
  @ApiProperty({ description: 'Weekday business hours' })
  @Prop({ required: true })
  weekday: string;

  @ApiProperty({ description: 'Weekend business hours' })
  @Prop({ required: true })
  weekend: string;

  @ApiProperty({ description: 'Whether hours display is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterContact {
  @ApiProperty({ description: 'Phone contact information', type: FooterContactPhone })
  @Prop({ type: FooterContactPhone, required: true })
  phone: FooterContactPhone;

  @ApiProperty({ description: 'Email contact information', type: FooterContactEmail })
  @Prop({ type: FooterContactEmail, required: true })
  email: FooterContactEmail;

  @ApiProperty({ description: 'Physical address information', type: FooterContactAddress })
  @Prop({ type: FooterContactAddress, required: true })
  address: FooterContactAddress;

  @ApiProperty({ description: 'Business hours information', type: FooterContactHours })
  @Prop({ type: FooterContactHours, required: true })
  hours: FooterContactHours;
}

@Schema()
export class FooterLanguage {
  @ApiProperty({ description: 'Language code (e.g., en, fr, es)' })
  @Prop({ required: true })
  code: string;

  @ApiProperty({ description: 'Display name of the language' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Flag icon identifier', required: false })
  @Prop()
  flag?: string;
}

@Schema()
export class FooterLogo {
  @ApiProperty({ description: 'Logo image URL' })
  @Prop({ required: true })
  src: string;

  @ApiProperty({ description: 'Logo alt text' })
  @Prop({ required: true })
  alt: string;

  @ApiProperty({ description: 'Logo width in pixels' })
  @Prop({ required: true })
  width: number;

  @ApiProperty({ description: 'Logo height in pixels' })
  @Prop({ required: true })
  height: number;
}

@Schema()
export class FooterSocialMedia {
  @ApiProperty({ description: 'Social media section title' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ description: 'Whether social media section is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;

  @ApiProperty({ description: 'Social media links', type: [FooterSocialLink] })
  @Prop({ type: [FooterSocialLink], required: true })
  links: FooterSocialLink[];
}

@Schema()
export class FooterLanguageSelector {
  @ApiProperty({ description: 'Whether language selector is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;

  @ApiProperty({ description: 'Current active language' })
  @Prop({ required: true })
  currentLanguage: string;

  @ApiProperty({ description: 'Available languages', type: [FooterLanguage] })
  @Prop({ type: [FooterLanguage], required: true })
  languages: FooterLanguage[];
}

@Schema()
export class FooterCopyright {
  @ApiProperty({ description: 'Copyright start year' })
  @Prop({ required: true })
  startYear: number;

  @ApiProperty({ description: 'Company name' })
  @Prop({ required: true })
  companyName: string;

  @ApiProperty({ description: 'Rights reserved text' })
  @Prop({ required: true })
  rightsText: string;

  @ApiProperty({ description: 'Optional contact link', required: false })
  @Prop({ type: Object })
  contactLink?: {
    text: string;
    href: string;
  };
}

@Schema()
export class FooterDescription {
  @ApiProperty({ description: 'Footer description text' })
  @Prop({ required: true })
  text: string;

  @ApiProperty({ description: 'Whether description is enabled' })
  @Prop({ required: true, default: true })
  enabled: boolean;
}

@Schema()
export class FooterStyling {
  @ApiProperty({ description: 'Background color' })
  @Prop({ required: true, default: '#1a1a1a' })
  backgroundColor: string;

  @ApiProperty({ description: 'Text color' })
  @Prop({ required: true, default: '#ffffff' })
  textColor: string;

  @ApiProperty({ description: 'Accent color for links and highlights' })
  @Prop({ required: true, default: '#3b82f6' })
  accentColor: string;

  @ApiProperty({ description: 'Border color' })
  @Prop({ required: true, default: '#374151' })
  borderColor: string;

  @ApiProperty({ description: 'Top padding in pixels' })
  @Prop({ required: true, default: 80 })
  paddingTop: number;

  @ApiProperty({ description: 'Bottom padding in pixels' })
  @Prop({ required: true, default: 48 })
  paddingBottom: number;
}

@Schema()
export class FooterSEOAccessibility {
  @ApiProperty({ description: 'ARIA labels for accessibility' })
  @Prop({ type: Object, required: true })
  ariaLabels: {
    footer: string;
    socialLinks: string;
    newsletter: string;
    sections: string;
    bottomLinks: string;
  };
}

@Schema()
export class FooterSEO {
  @ApiProperty({ description: 'JSON-LD structured data', required: false })
  @Prop({ type: Object })
  footerSchema?: any;

  @ApiProperty({ description: 'Accessibility configuration', type: FooterSEOAccessibility })
  @Prop({ type: FooterSEOAccessibility, required: true })
  accessibility: FooterSEOAccessibility;
}

@Schema({ timestamps: true })
export class Footer extends Document {
  @ApiProperty({ description: 'Whether footer is enabled and visible' })
  @Prop({ required: true, default: true })
  enabled: boolean;

  @ApiProperty({ description: 'Footer logo configuration', type: FooterLogo })
  @Prop({ type: FooterLogo, required: true })
  logo: FooterLogo;

  @ApiProperty({ description: 'Footer description', type: FooterDescription })
  @Prop({ type: FooterDescription, required: true })
  description: FooterDescription;

  @ApiProperty({ description: 'Social media configuration', type: FooterSocialMedia })
  @Prop({ type: FooterSocialMedia, required: true })
  socialMedia: FooterSocialMedia;

  @ApiProperty({ description: 'Footer link sections', type: [FooterSection] })
  @Prop({ type: [FooterSection], required: true })
  sections: FooterSection[];

  @ApiProperty({ description: 'Newsletter subscription section', type: FooterNewsletter })
  @Prop({ type: FooterNewsletter, required: true })
  newsletter: FooterNewsletter;

  @ApiProperty({ description: 'Contact information', type: FooterContact })
  @Prop({ type: FooterContact, required: true })
  contact: FooterContact;

  @ApiProperty({ description: 'Bottom footer links', type: [FooterLink] })
  @Prop({ type: [FooterLink], required: true })
  bottomLinks: FooterLink[];

  @ApiProperty({ description: 'Language selector configuration', type: FooterLanguageSelector })
  @Prop({ type: FooterLanguageSelector, required: true })
  languageSelector: FooterLanguageSelector;

  @ApiProperty({ description: 'Copyright information', type: FooterCopyright })
  @Prop({ type: FooterCopyright, required: true })
  copyright: FooterCopyright;

  @ApiProperty({ description: 'Optional statistics section', type: [FooterStats], required: false })
  @Prop({ type: [FooterStats] })
  stats?: FooterStats[];

  @ApiProperty({ description: 'Footer styling configuration', type: FooterStyling })
  @Prop({ type: FooterStyling, required: true })
  styling: FooterStyling;

  @ApiProperty({ description: 'SEO and accessibility configuration', type: FooterSEO })
  @Prop({ type: FooterSEO, required: true })
  seo: FooterSEO;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export const FooterSchema = SchemaFactory.createForClass(Footer);

// Create indexes for better query performance
FooterSchema.index({ enabled: 1 });
FooterSchema.index({ updatedAt: -1 });
FooterSchema.index({ createdAt: -1 });