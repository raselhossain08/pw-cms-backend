import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TermsConditions } from './schemas/terms-conditions.schema';
import {
  CreateTermsConditionsDto,
  UpdateTermsConditionsDto,
} from './dto/terms-conditions.dto';

@Injectable()
export class TermsConditionsService {
  constructor(
    @InjectModel(TermsConditions.name)
    private termsConditionsModel: Model<TermsConditions>,
  ) { }

  async create(createDto: CreateTermsConditionsDto): Promise<TermsConditions> {
    // Deactivate all existing terms
    await this.termsConditionsModel.updateMany({}, { isActive: false });

    const termsConditions = new this.termsConditionsModel({
      ...createDto,
      isActive: true,
    });
    return termsConditions.save();
  }

  async findAll(): Promise<TermsConditions[]> {
    return this.termsConditionsModel.find().sort({ createdAt: -1 }).exec();
  }

  async findActive(): Promise<TermsConditions | null> {
    return this.termsConditionsModel.findOne({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<TermsConditions> {
    const termsConditions = await this.termsConditionsModel.findById(id).exec();
    if (!termsConditions) {
      throw new NotFoundException(`Terms & Conditions with ID ${id} not found`);
    }
    return termsConditions;
  }

  async update(
    id: string,
    updateDto: UpdateTermsConditionsDto,
  ): Promise<TermsConditions> {
    const termsConditions = await this.termsConditionsModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!termsConditions) {
      throw new NotFoundException(`Terms & Conditions with ID ${id} not found`);
    }

    // If setting as active, deactivate others
    if (updateDto.isActive) {
      await this.termsConditionsModel.updateMany(
        { _id: { $ne: id } },
        { isActive: false },
      );
    }

    return termsConditions;
  }

  async delete(id: string): Promise<void> {
    const result = await this.termsConditionsModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Terms & Conditions with ID ${id} not found`);
    }
  }

  async getOrCreateDefault(): Promise<TermsConditions> {
    const existing = await this.findActive();
    if (existing) {
      return existing;
    }

    // Create default terms & conditions with all 11 sections from current page
    const defaultTerms: CreateTermsConditionsDto = {
      headerSection: {
        title: 'Terms & Conditions',
        subtitle:
          'Please read these terms and conditions carefully before using our service',
        image: '',
        imageAlt: 'Terms and Conditions',
      },
      lastUpdated: 'November 17, 2025',
      sections: [
        {
          id: 'introduction',
          title: '1. Introduction',
          order: 1,
          isActive: true,
          content: [
            'Welcome to Personal Wings. These Terms and Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these terms. If you disagree with any part of these terms, please do not use our services.',
            'We reserve the right to update these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service after changes constitutes acceptance of the new terms.',
          ],
          subsections: [],
        },
        {
          id: 'account-registration',
          title: '2. Account Registration',
          order: 2,
          isActive: true,
          content: [
            'To access certain features of our platform, you must create an account. You agree to:',
          ],
          subsections: [
            {
              title: 'Your Responsibilities',
              content: [
                'Provide accurate and complete registration information',
                'Maintain the security of your password and account',
                'Notify us immediately of any unauthorized use of your account',
                'Accept responsibility for all activities under your account',
                'Not share your account credentials with any third party',
              ],
            },
            {
              title: 'Age Requirements',
              content: [
                'You must be at least 18 years old to create an account. If you are under 18, you may only use our services with parental or guardian consent.',
              ],
            },
          ],
        },
        {
          id: 'course-access',
          title: '3. Course Access and Usage',
          order: 3,
          isActive: true,
          content: [
            'Upon enrollment in a course, you will be granted access to course materials subject to the following conditions:',
          ],
          subsections: [
            {
              title: 'Usage Rights',
              content: [
                'Course content is for personal, non-commercial use only',
                'You may not share, reproduce, or distribute course materials',
                'Access is granted for the duration of your course enrollment',
                'We reserve the right to modify or discontinue courses at any time',
                'Certificates are awarded upon successful course completion',
              ],
            },
          ],
        },
        {
          id: 'payment-refunds',
          title: '4. Payment and Refunds',
          order: 4,
          isActive: true,
          content: [
            'All fees are stated in USD and are non-refundable except as required by law or as explicitly stated in our refund policy.',
          ],
          subsections: [
            {
              title: 'Payment Terms',
              content: [
                'Payment is due at the time of enrollment',
                'We offer a 30-day money-back guarantee for eligible courses',
              ],
            },
          ],
        },
        {
          id: 'intellectual-property',
          title: '5. Intellectual Property Rights',
          order: 5,
          isActive: true,
          content: [
            'All content on this platform, including but not limited to text, graphics, logos, images, videos, and software, is the property of Personal Wings or its content suppliers and is protected by international copyright laws.',
            'You may not reproduce, distribute, modify, create derivative works, publicly display, or exploit any content without our express written permission.',
          ],
          subsections: [],
        },
        {
          id: 'user-conduct',
          title: '6. User Conduct',
          order: 6,
          isActive: true,
          content: [
            'You agree not to engage in any of the following prohibited activities:',
          ],
          subsections: [
            {
              title: 'Prohibited Activities',
              content: [
                'Violating any laws, regulations, or third-party rights',
                'Uploading viruses or malicious code to the platform',
                'Attempting to gain unauthorized access to our systems',
                'Harassing, abusing, or harming other users or instructors',
                'Using the platform for any illegal or unauthorized purpose',
                'Impersonating another person or entity',
              ],
            },
          ],
        },
        {
          id: 'privacy-data',
          title: '7. Privacy and Data Protection',
          order: 7,
          isActive: true,
          content: [
            'Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information. By using our services, you consent to our data practices as described in the Privacy Policy.',
            'We implement appropriate security measures to protect your data, but cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account information.',
          ],
          subsections: [],
        },
        {
          id: 'limitation-liability',
          title: '8. Limitation of Liability',
          order: 8,
          isActive: true,
          content: [
            'To the fullest extent permitted by law, Personal Wings shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from:',
          ],
          subsections: [
            {
              title: 'Liability Exclusions',
              content: [
                'Your use or inability to use the service',
                'Unauthorized access to your account or data',
                'Errors or omissions in course content',
                'Interruption or cessation of services',
                'Third-party content or conduct',
              ],
            },
          ],
        },
        {
          id: 'termination',
          title: '9. Termination',
          order: 9,
          isActive: true,
          content: [
            'We reserve the right to suspend or terminate your account at any time, with or without notice, for violating these terms or for any other reason at our discretion.',
            'Upon termination, your right to access the platform will immediately cease, and we may delete your account and content without liability.',
          ],
          subsections: [],
        },
        {
          id: 'governing-law',
          title: '10. Governing Law',
          order: 10,
          isActive: true,
          content: [
            'These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which Personal Wings operates, without regard to its conflict of law provisions. Any disputes arising from these terms shall be resolved through binding arbitration.',
          ],
          subsections: [],
        },
        {
          id: 'contact-information',
          title: '11. Contact Information',
          order: 11,
          isActive: true,
          content: [
            'If you have any questions about these Terms and Conditions, please contact us:',
          ],
          subsections: [],
        },
      ],
      contactInfo: {
        email: 'support@personalwings.com',
        phone: '+444 555 666 777',
        address: '123 Education Street, Learning City, ED 12345',
      },
      seoMeta: {
        title: 'Terms & Conditions - Personal Wings',
        description:
          'Read our terms and conditions to understand your rights and obligations when using Personal Wings platform.',
        keywords: [
          'terms and conditions',
          'terms of service',
          'user agreement',
          'legal terms',
          'service terms',
        ],
        ogTitle: 'Terms & Conditions - Personal Wings',
        ogDescription:
          'Read our terms and conditions to understand your rights and obligations when using Personal Wings platform.',
        ogImage: '',
        canonicalUrl: 'https://personalwings.com/terms-conditions',
      },
      acceptanceSection: {
        title: 'Acceptance of Terms',
        content:
          'By using Personal Wings, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must discontinue use of our services immediately.',
        isActive: true,
      },
      isActive: true,
    };

    const newTerms = new this.termsConditionsModel(defaultTerms);
    return newTerms.save();
  }

  async toggleActive(id: string): Promise<TermsConditions> {
    const termsConditions = await this.findOne(id);

    // If activating, deactivate all others
    if (!termsConditions.isActive) {
      await this.termsConditionsModel.updateMany(
        { _id: { $ne: id } },
        { isActive: false },
      );
    }

    termsConditions.isActive = !termsConditions.isActive;
    return termsConditions.save();
  }

  async duplicate(id: string): Promise<TermsConditions> {
    const original = await this.findOne(id);

    const duplicated = new this.termsConditionsModel({
      headerSection: { ...original.headerSection },
      lastUpdated: original.lastUpdated,
      sections: JSON.parse(JSON.stringify(original.sections)),
      contactInfo: { ...original.contactInfo },
      seoMeta: { ...original.seoMeta },
      acceptanceSection: { ...original.acceptanceSection },
      isActive: false, // Duplicated items are inactive by default
    });

    return duplicated.save();
  }

  async export(id: string, format: 'json' | 'pdf' = 'json'): Promise<any> {
    const termsConditions = await this.findOne(id);

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(termsConditions, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      termsConditions,
    };
  }

  async exportAll(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const allTermsConditions = await this.findAll();

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      return JSON.stringify(allTermsConditions, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      termsConditions: allTermsConditions,
    };
  }
}
