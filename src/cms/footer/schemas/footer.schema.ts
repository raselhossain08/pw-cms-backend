import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FooterDocument = Footer & Document;

@Schema()
class Logo {
  @Prop({ required: true })
  src: string;

  @Prop()
  publicId: string;

  @Prop({ required: true })
  alt: string;

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;
}

@Schema()
class SocialLink {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  label: string;
}

@Schema()
class SocialMedia {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [SocialLink], default: [] })
  links: SocialLink[];
}

@Schema()
class SectionLink {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  href: string;
}

@Schema()
class Section {
  @Prop({ required: true })
  title: string;

  @Prop({ type: [SectionLink], default: [] })
  links: SectionLink[];
}

@Schema()
class Newsletter {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  placeholder: string;

  @Prop({ required: true })
  buttonText: string;
}

@Schema()
class BottomLink {
  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  href: string;
}

@Schema()
class Language {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;
}

@Schema()
class LanguageSelector {
  @Prop({ required: true })
  currentLanguage: string;

  @Prop({ type: [Language], default: [] })
  languages: Language[];
}

@Schema()
class ContactInfo {
  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  phoneHref: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  emailHref: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  hours: string;
}

@Schema()
class CompanyInfo {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  foundedYear: string;

  @Prop({ required: true, default: 'Personal Wings, Inc.' })
  companyName: string;

  @Prop({ required: true, default: 'All Rights Reserved' })
  rightsText: string;

  @Prop({ required: true, default: '/contact' })
  contactLink: string;
}

@Schema({ timestamps: true })
export class Footer {
  @Prop({ type: Logo, required: true })
  logo: Logo;

  @Prop({ type: SocialMedia, required: true })
  socialMedia: SocialMedia;

  @Prop({ type: [Section], default: [] })
  sections: Section[];

  @Prop({ type: Newsletter, required: true })
  newsletter: Newsletter;

  @Prop({ type: [BottomLink], default: [] })
  bottomLinks: BottomLink[];

  @Prop({ type: LanguageSelector, required: true })
  languageSelector: LanguageSelector;

  @Prop({ type: ContactInfo, required: true })
  contact: ContactInfo;

  @Prop({ type: CompanyInfo, required: true })
  companyInfo: CompanyInfo;

  @Prop({ required: true, default: false })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FooterSchema = SchemaFactory.createForClass(Footer);
