import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from '../home/banner/schemas/banner.schema';
import { AboutSection } from '../home/about-section/schemas/about-section.schema';
import { Events } from '../home/events/schemas/events.schema';
import { Testimonials } from '../home/testimonials/schemas/testimonials.schema';
import { Blog } from '../home/blog/schemas/blog.schema';
import { AboutUs } from '../about-us/schemas/about-us.schema';
import { Contact } from '../contact/schemas/contact.schema';
import { Faqs } from '../faqs/schemas/faqs.schema';
import { PrivacyPolicy } from '../privacy-policy/schemas/privacy-policy.schema';
import { RefundPolicy } from '../refund-policy/schemas/refund-policy.schema';
import { TermsConditions } from '../terms-conditions/schemas/terms-conditions.schema';
import { TopBar } from '../header/schemas/top-bar.schema';
import { Footer } from '../footer/schemas/footer.schema';

@Injectable()
export class OverviewService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<Banner>,
    @InjectModel(AboutSection.name)
    private aboutSectionModel: Model<AboutSection>,
    @InjectModel(Events.name) private eventsModel: Model<Events>,
    @InjectModel(Testimonials.name)
    private testimonialsModel: Model<Testimonials>,
    @InjectModel(Blog.name) private blogModel: Model<Blog>,
    @InjectModel(AboutUs.name) private aboutUsModel: Model<AboutUs>,
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(Faqs.name) private faqModel: Model<Faqs>,
    @InjectModel(PrivacyPolicy.name)
    private privacyPolicyModel: Model<PrivacyPolicy>,
    @InjectModel(RefundPolicy.name)
    private refundPolicyModel: Model<RefundPolicy>,
    @InjectModel(TermsConditions.name)
    private termsConditionsModel: Model<TermsConditions>,
    @InjectModel(TopBar.name) private topBarModel: Model<TopBar>,
    @InjectModel(Footer.name) private footerModel: Model<Footer>,
  ) {}

  async getStats() {
    const [
      banners,
      aboutSection,
      events,
      testimonials,
      blogs,
      aboutUs,
      contact,
      faqs,
      privacyPolicy,
      refundPolicy,
      termsConditions,
      topBars,
      footers,
    ] = await Promise.all([
      this.bannerModel.find().exec(),
      this.aboutSectionModel.findOne({ id: 'about' }).exec(),
      this.eventsModel.find().exec(),
      this.testimonialsModel.find().exec(),
      this.blogModel.find().exec(),
      this.aboutUsModel.findOne().exec(),
      this.contactModel.findOne().exec(),
      this.faqModel.find().exec(),
      this.privacyPolicyModel.findOne().exec(),
      this.refundPolicyModel.findOne().exec(),
      this.termsConditionsModel.findOne().exec(),
      this.topBarModel.find().exec(),
      this.footerModel.find().exec(),
    ]);

    return {
      success: true,
      message: 'CMS statistics retrieved successfully',
      data: {
        banners: {
          total: banners.length,
          active: banners.filter((b) => b.isActive).length,
          inactive: banners.filter((b) => !b.isActive).length,
        },
        events: {
          total: events.length > 0 ? events[0]?.events?.length || 0 : 0,
          active: events.length > 0 ? events[0]?.events?.length || 0 : 0,
          inactive: 0,
        },
        testimonials: {
          total:
            testimonials.length > 0
              ? testimonials[0]?.testimonials?.length || 0
              : 0,
          active: testimonials.filter((t) => t.isActive).length,
          inactive: testimonials.filter((t) => !t.isActive).length,
        },
        blogPosts: {
          total: blogs.length > 0 ? blogs[0]?.blogs?.length || 0 : 0,
          published:
            blogs.length > 0
              ? blogs[0]?.blogs?.filter((b: any) => b.status === 'published')
                  ?.length || 0
              : 0,
          draft:
            blogs.length > 0
              ? blogs[0]?.blogs?.filter((b: any) => b.status === 'draft')
                  ?.length || 0
              : 0,
        },
        aboutSection: {
          isActive: aboutSection?.isActive || false,
          hasContent: !!aboutSection,
        },
        pages: {
          aboutUs: !!aboutUs,
          contact: !!contact,
          faqs: faqs.length > 0,
          privacyPolicy: !!privacyPolicy,
          refundPolicy: !!refundPolicy,
          termsConditions: !!termsConditions,
        },
        header: {
          configured: topBars.length > 0,
        },
        footer: {
          configured: footers.length > 0,
        },
      },
    };
  }

  async getSections() {
    const [
      banners,
      aboutSection,
      events,
      testimonials,
      blogs,
      aboutUs,
      contact,
      faqs,
      privacyPolicy,
      refundPolicy,
      termsConditions,
      topBars,
      footers,
    ] = await Promise.all([
      this.bannerModel.find().exec(),
      this.aboutSectionModel.findOne({ id: 'about' }).exec(),
      this.eventsModel.find().exec(),
      this.testimonialsModel.find().exec(),
      this.blogModel.find().exec(),
      this.aboutUsModel.findOne().exec(),
      this.contactModel.findOne().exec(),
      this.faqModel.find().exec(),
      this.privacyPolicyModel.findOne().exec(),
      this.refundPolicyModel.findOne().exec(),
      this.termsConditionsModel.findOne().exec(),
      this.topBarModel.find().exec(),
      this.footerModel.find().exec(),
    ]);

    const sections = [
      {
        id: 'home-banner',
        label: 'Home Banner',
        href: '/cms/home/banner',
        icon: 'PlayCircle',
        status: banners.length > 0 ? 'configured' : 'empty',
        category: 'home',
        hasContent: banners.length > 0,
        lastUpdated: banners[0]?.updatedAt?.toISOString(),
      },
      {
        id: 'about-section',
        label: 'About Section',
        href: '/cms/home/about-section',
        icon: 'Heart',
        status: aboutSection?.isActive ? 'active' : 'inactive',
        category: 'home',
        hasContent: !!aboutSection,
        lastUpdated:
          (aboutSection as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'events',
        label: 'Events',
        href: '/cms/home/events',
        icon: 'Calendar',
        status:
          events.length > 0 && (events[0]?.events?.length || 0) > 0
            ? 'active'
            : events.length > 0
              ? 'inactive'
              : 'empty',
        category: 'home',
        hasContent: events.length > 0 && (events[0]?.events?.length || 0) > 0,
        lastUpdated:
          (events[0] as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'testimonials',
        label: 'Testimonials',
        href: '/cms/home/testimonials',
        icon: 'MessageSquare',
        status:
          testimonials.length > 0 && testimonials[0]?.isActive
            ? 'active'
            : testimonials.length > 0
              ? 'inactive'
              : 'empty',
        category: 'home',
        hasContent:
          testimonials.length > 0 &&
          (testimonials[0]?.testimonials?.length || 0) > 0,
        lastUpdated:
          (testimonials[0] as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'blog',
        label: 'Blog',
        href: '/cms/home/blog',
        icon: 'Newspaper',
        status:
          blogs.length > 0 && blogs[0]?.isActive
            ? 'active'
            : blogs.length > 0
              ? 'inactive'
              : 'empty',
        category: 'home',
        hasContent: blogs.length > 0 && (blogs[0]?.blogs?.length || 0) > 0,
        lastUpdated:
          (blogs[0] as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'header',
        label: 'Header',
        href: '/cms/header',
        icon: 'Image',
        status: 'manage',
        category: 'navigation',
        hasContent: topBars.length > 0,
        lastUpdated: topBars[0]?.updatedAt?.toISOString(),
      },
      {
        id: 'footer',
        label: 'Footer',
        href: '/cms/footer',
        icon: 'Image',
        status: 'manage',
        category: 'navigation',
        hasContent: footers.length > 0,
        lastUpdated: footers[0]?.updatedAt?.toISOString(),
      },
      {
        id: 'about-us',
        label: 'About Us',
        href: '/cms/about-us',
        icon: 'Users',
        status: 'manage',
        category: 'pages',
        hasContent: !!aboutUs,
        lastUpdated:
          (aboutUs as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'contact',
        label: 'Contact Page',
        href: '/cms/contact',
        icon: 'MessageSquare',
        status: 'manage',
        category: 'pages',
        hasContent: !!contact,
        lastUpdated: contact?.updatedAt?.toISOString(),
      },
      {
        id: 'faqs',
        label: 'FAQs',
        href: '/cms/faqs',
        icon: 'CircleHelp',
        status: 'manage',
        category: 'pages',
        hasContent: faqs.length > 0,
        lastUpdated:
          (faqs[0] as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'privacy-policy',
        label: 'Privacy Policy',
        href: '/cms/privacy-policy',
        icon: 'ShieldCheck',
        status: 'manage',
        category: 'policies',
        hasContent: !!privacyPolicy,
        lastUpdated:
          (privacyPolicy as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'refund-policy',
        label: 'Refund Policy',
        href: '/cms/refund-policy',
        icon: 'ShieldCheck',
        status: 'manage',
        category: 'policies',
        hasContent: !!refundPolicy,
        lastUpdated:
          (refundPolicy as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
      {
        id: 'terms-conditions',
        label: 'Terms & Conditions',
        href: '/cms/terms-conditions',
        icon: 'ShieldCheck',
        status: 'manage',
        category: 'policies',
        hasContent: !!termsConditions,
        lastUpdated:
          (termsConditions as any)?.updatedAt?.toISOString() ||
          new Date().toISOString(),
      },
    ];

    return {
      success: true,
      message: 'CMS sections retrieved successfully',
      data: sections,
    };
  }

  async exportData(format: 'json' | 'csv' = 'json') {
    const stats = await this.getStats();
    const sections = await this.getSections();

    const exportData = {
      exportedAt: new Date().toISOString(),
      stats: stats.data,
      sections: sections.data,
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows: string[] = [];
      csvRows.push('Section,Status,Category,Has Content,Last Updated');
      sections.data.forEach((section: any) => {
        csvRows.push(
          `"${section.label}","${section.status}","${section.category}","${section.hasContent}","${section.lastUpdated || 'N/A'}"`,
        );
      });
      return {
        success: true,
        message: 'CMS data exported successfully',
        data: csvRows.join('\n'),
        contentType: 'text/csv',
      };
    }

    return {
      success: true,
      message: 'CMS data exported successfully',
      data: exportData,
      contentType: 'application/json',
    };
  }
}
