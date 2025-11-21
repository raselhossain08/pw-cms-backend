// src/modules/footer/footer.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Footer } from './entities/footer.entity';
import { UpdateFooterDto } from './dto/update-footer.dto';
import {
  UpdateFooterLogoDto as NestedUpdateFooterLogoDto,
  UpdateFooterSocialMediaDto,
  UpdateFooterSectionsDto,
  UpdateFooterNewsletterDto,
  UpdateFooterContactDto,
  UpdateFooterBottomLinksDto,
  UpdateFooterCopyrightDto,
  UpdateFooterStylingDto,
  UpdateFooterSEODto
} from './dto/partial-update-footer.dto';
import { UpdateFooterLogoDto } from './dto/update-logo.dto';
import { NewsletterSubscribeDto, NewsletterUnsubscribeDto } from './dto/newsletter.dto';

@Injectable()
export class FooterService {
  constructor(
    @InjectModel(Footer.name)
    private readonly footerModel: Model<Footer>,
  ) { }

  /**
   * Get the active footer (singleton pattern - only one footer exists)
   * Optimized with lean() for better performance and caching
   */
  async findActive(): Promise<Footer> {
    let footer = await this.footerModel
      .findOne({ enabled: true })
      .sort({ updatedAt: -1 })
      .lean() // Returns plain JavaScript objects instead of Mongoose documents for better performance
      .exec();

    // If no footer exists, create a default one
    if (!footer) {
      const footers = await this.footerModel.find().lean().exec();
      if (footers.length > 0) {
        footer = footers[0];
      } else {
        throw new NotFoundException('No footer configuration found. Please run seed command.');
      }
    }

    return footer as unknown as Footer;
  }

  /**
   * Update the active footer with partial data
   */
  async updateActive(updateFooterDto: UpdateFooterDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: updateFooterDto },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer');
    }

    return updated;
  }

  /**
   * Update only the logo section
   */
  async updateLogo(logoDto: UpdateFooterLogoDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    // Debug logging for backend logo update
    console.log('🔧 Backend Footer Service - updateLogo:', {
      activeFooterId: activeFooter._id,
      receivedLogoDto: logoDto,
      logoSrc: logoDto.src,
      isValidUploadPath: logoDto.src?.startsWith('/uploads/'),
      timestamp: new Date().toISOString()
    });

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { logo: logoDto } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer logo');
    }

    // Log the result
    console.log('✅ Backend Footer Service - updateLogo result:', {
      updateSuccess: !!updated,
      resultLogoSrc: updated.logo?.src,
      originalSrc: logoDto.src,
      pathPreserved: logoDto.src === updated.logo?.src,
      fullLogo: updated.logo,
      timestamp: new Date().toISOString()
    });

    return updated;
  }

  /**
   * Update only the social media section
   */
  async updateSocialMedia(socialMediaDto: UpdateFooterSocialMediaDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { socialMedia: socialMediaDto.socialMedia } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update social media');
    }

    return updated;
  }

  /**
   * Update only the sections
   */
  async updateSections(sectionsDto: UpdateFooterSectionsDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { sections: sectionsDto.sections } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer sections');
    }

    return updated;
  }

  /**
   * Update only the newsletter section
   */
  async updateNewsletter(newsletterDto: UpdateFooterNewsletterDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { newsletter: newsletterDto.newsletter } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update newsletter section');
    }

    return updated;
  }

  /**
   * Update only the contact section
   */
  async updateContact(contactDto: UpdateFooterContactDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { contact: contactDto.contact } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update contact information');
    }

    return updated;
  }

  /**
   * Update only the bottom links
   */
  async updateBottomLinks(bottomLinksDto: UpdateFooterBottomLinksDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { bottomLinks: bottomLinksDto.bottomLinks } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update bottom links');
    }

    return updated;
  }

  /**
   * Update only the copyright section
   */
  async updateCopyright(copyrightDto: UpdateFooterCopyrightDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { copyright: copyrightDto.copyright } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update copyright information');
    }

    return updated;
  }

  /**
   * Update only the styling section
   */
  async updateStyling(stylingDto: UpdateFooterStylingDto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { styling: stylingDto.styling } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer styling');
    }

    return updated;
  }

  /**
   * Update only the SEO section
   */
  async updateSEO(seoDto: UpdateFooterSEODto): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { seo: seoDto.seo } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update SEO configuration');
    }

    return updated;
  }

  /**
   * Toggle footer enabled/disabled status
   */
  async toggleFooter(enabled: boolean): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { enabled } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to toggle footer status');
    }

    return updated;
  }

  /**
   * Newsletter subscription management
   */
  async subscribeNewsletter(subscribeDto: NewsletterSubscribeDto): Promise<{ message: string; email: string }> {
    // This is a simplified implementation
    // In a real application, you would store newsletter subscriptions in a separate collection
    // and possibly integrate with email service providers like Mailchimp, SendGrid, etc.
    
    const { email, source = 'footer' } = subscribeDto;
    
    // Basic email validation (additional to DTO validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email address format');
    }

    // Here you would typically:
    // 1. Check if email already exists in newsletter_subscriptions collection
    // 2. Add email to newsletter service (Mailchimp, SendGrid, etc.)
    // 3. Send confirmation email
    // 4. Store subscription in database with timestamp and source

    console.log(`Newsletter subscription: ${email} from ${source}`);
    
    return {
      message: 'Successfully subscribed to newsletter',
      email
    };
  }

  /**
   * Newsletter unsubscription
   */
  async unsubscribeNewsletter(unsubscribeDto: NewsletterUnsubscribeDto): Promise<{ message: string; email: string }> {
    const { email } = unsubscribeDto;
    
    // Here you would typically:
    // 1. Check if email exists in newsletter_subscriptions collection
    // 2. Remove email from newsletter service
    // 3. Update database record to mark as unsubscribed
    // 4. Send confirmation email

    console.log(`Newsletter unsubscription: ${email}`);
    
    return {
      message: 'Successfully unsubscribed from newsletter',
      email
    };
  }

  /**
   * Get newsletter statistics
   */
  async getNewsletterStats(): Promise<{
    totalSubscribers: number;
    activeSubscribers: number;
    monthlySubscriptions: number;
    growthRate: number;
  }> {
    // This is a mock implementation
    // In a real application, you would query the newsletter_subscriptions collection
    
    return {
      totalSubscribers: 1250,
      activeSubscribers: 1180,
      monthlySubscriptions: 85,
      growthRate: 12.5
    };
  }

  /**
   * Update footer description
   */
  async updateDescription(description: { text: string; enabled: boolean }): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { description } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer description');
    }

    return updated;
  }

  /**
   * Update language selector
   */
  async updateLanguageSelector(languageSelector: any): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { languageSelector } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update language selector');
    }

    return updated;
  }

  /**
   * Update footer stats
   */
  async updateStats(stats: any[]): Promise<Footer> {
    const activeFooter = await this.findActive();

    const updated = await this.footerModel
      .findByIdAndUpdate(
        activeFooter._id,
        { $set: { stats } },
        { new: true }
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to update footer stats');
    }

    return updated;
  }
}