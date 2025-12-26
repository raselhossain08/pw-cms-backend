import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrivacyPolicy } from '../schemas/privacy-policy.schema';
import {
  CreatePrivacyPolicyDto,
  UpdatePrivacyPolicyDto,
} from '../dto/privacy-policy.dto';

@Injectable()
export class PrivacyPolicyService {
  constructor(
    @InjectModel(PrivacyPolicy.name)
    private privacyPolicyModel: Model<PrivacyPolicy>,
  ) {}

  async create(
    createPrivacyPolicyDto: CreatePrivacyPolicyDto,
  ): Promise<PrivacyPolicy> {
    const createdPrivacyPolicy = new this.privacyPolicyModel(
      createPrivacyPolicyDto,
    );
    return createdPrivacyPolicy.save();
  }

  async findAll(): Promise<PrivacyPolicy[]> {
    return this.privacyPolicyModel.find().exec();
  }

  async findActive(): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyModel.findOne({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyModel.findById(id).exec();
  }

  async update(
    id: string,
    updatePrivacyPolicyDto: UpdatePrivacyPolicyDto,
  ): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyModel
      .findByIdAndUpdate(id, updatePrivacyPolicyDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<PrivacyPolicy | null> {
    return this.privacyPolicyModel.findByIdAndDelete(id).exec();
  }

  async getOrCreateDefault(): Promise<PrivacyPolicy> {
    const existingPolicy = await this.privacyPolicyModel.findOne().exec();
    if (existingPolicy) {
      return existingPolicy;
    }

    const defaultPrivacyPolicy: CreatePrivacyPolicyDto = {
      headerSection: {
        title: 'Privacy Policy',
        subtitle:
          'Your privacy is important to us. Learn how we protect your data',
        image: '',
        imageAlt: '',
      },
      lastUpdated: 'November 17, 2025',
      sections: [
        {
          id: 'introduction',
          title: '1. Introduction',
          content: [
            'Welcome to Personal Wings. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.',
            'By accessing or using Personal Wings, you agree to the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.',
          ],
          isActive: true,
          order: 1,
        },
        {
          id: 'information-we-collect',
          title: '2. Information We Collect',
          content: [
            'We collect several types of information from and about users of our platform:',
          ],
          subsections: [
            {
              title: '2.1 Personal Information',
              content: [
                'Name and contact information (email, phone number)',
                'Account credentials (username and password)',
                'Profile information and photo',
                'Payment and billing information',
                'Communication preferences',
              ],
            },
            {
              title: '2.2 Usage Information',
              content: [
                'Course enrollment and completion data',
                'Learning progress and quiz results',
                'Platform usage statistics and activity logs',
                'Device information (IP address, browser type, operating system)',
                'Cookies and tracking technologies',
              ],
            },
            {
              title: '2.3 User-Generated Content',
              content: [
                'Reviews and ratings',
                'Comments and discussion forum posts',
                'Assignments and project submissions',
                'Feedback and survey responses',
              ],
            },
          ],
          isActive: true,
          order: 2,
        },
        {
          id: 'how-we-use-information',
          title: '3. How We Use Your Information',
          content: [
            'We use the information we collect for the following purposes:',
            'To provide, maintain, and improve our educational services',
            'To process transactions and send related information',
            'To personalize your learning experience and recommend courses',
            'To communicate with you about courses, updates, and promotions',
            'To respond to your inquiries and provide customer support',
            'To monitor and analyze usage patterns and trends',
            'To detect, prevent, and address technical issues and security threats',
            'To comply with legal obligations and enforce our terms',
          ],
          isActive: true,
          order: 3,
        },
        {
          id: 'information-sharing',
          title: '4. Information Sharing and Disclosure',
          content: [
            'We do not sell your personal information. We may share your information in the following circumstances:',
          ],
          subsections: [
            {
              title: '4.1 Service Providers',
              content: [
                'We share information with third-party service providers who perform services on our behalf, such as payment processing, hosting, analytics, and customer service.',
              ],
            },
            {
              title: '4.2 Instructors',
              content: [
                'Course instructors may receive information about students enrolled in their courses, including progress and performance data, to facilitate teaching and provide feedback.',
              ],
            },
            {
              title: '4.3 Legal Requirements',
              content: [
                'We may disclose information when required by law, court order, or government request, or to protect our rights, property, or safety.',
              ],
            },
            {
              title: '4.4 Business Transfers',
              content: [
                'In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.',
              ],
            },
          ],
          isActive: true,
          order: 4,
        },
        {
          id: 'data-security',
          title: '5. Data Security',
          content: [
            'We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:',
            'Encryption of data in transit and at rest',
            'Regular security assessments and penetration testing',
            'Access controls and authentication mechanisms',
            'Employee training on data protection practices',
            'Incident response and breach notification procedures',
            'However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.',
          ],
          isActive: true,
          order: 5,
        },
        {
          id: 'your-rights',
          title: '6. Your Privacy Rights',
          content: [
            'Depending on your location, you may have the following rights regarding your personal information:',
          ],
          subsections: [
            {
              title: 'Privacy Rights Include:',
              content: [
                'Access: Request a copy of the personal information we hold about you',
                'Correction: Request correction of inaccurate or incomplete information',
                'Deletion: Request deletion of your personal information',
                'Portability: Receive your data in a structured, machine-readable format',
                'Objection: Object to processing of your information for certain purposes',
                'Withdrawal: Withdraw consent where we rely on consent to process your data',
              ],
            },
          ],
          isActive: true,
          order: 6,
        },
        {
          id: 'cookies',
          title: '7. Cookies and Tracking Technologies',
          content: [
            'We use cookies and similar tracking technologies to collect and track information about your activities on our platform. Cookies are small data files stored on your device.',
          ],
          subsections: [
            {
              title: 'Types of Cookies We Use:',
              content: [
                'Essential Cookies: Required for platform functionality',
                'Performance Cookies: Help us understand how visitors use our site',
                'Functionality Cookies: Remember your preferences and choices',
                'Advertising Cookies: Used to deliver relevant advertisements',
              ],
            },
          ],
          isActive: true,
          order: 7,
        },
        {
          id: 'data-retention',
          title: '8. Data Retention',
          content: [
            'We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.',
            'When we no longer need your information, we will securely delete or anonymize it. Factors affecting retention periods include legal obligations, dispute resolution, and business operations.',
          ],
          isActive: true,
          order: 8,
        },
        {
          id: 'childrens-privacy',
          title: "9. Children's Privacy",
          content: [
            'Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are under 18, please do not provide any information on this platform.',
            'If we discover that we have collected information from a child under 18 without parental consent, we will promptly delete that information.',
          ],
          isActive: true,
          order: 9,
        },
        {
          id: 'international-transfers',
          title: '10. International Data Transfers',
          content: [
            'Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws than your jurisdiction.',
            'When we transfer your information internationally, we ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy and applicable laws.',
          ],
          isActive: true,
          order: 10,
        },
        {
          id: 'policy-updates',
          title: '11. Changes to This Privacy Policy',
          content: [
            'We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page and updating the "Last Updated" date.',
            'We encourage you to review this Privacy Policy periodically. Your continued use of our services after changes are posted constitutes acceptance of the updated policy.',
          ],
          isActive: true,
          order: 11,
        },
        {
          id: 'contact',
          title: '12. Contact Us',
          content: [
            'If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:',
          ],
          isActive: true,
          order: 12,
        },
      ],
      contactInfo: {
        privacyTeam: 'privacy@personalwings.com',
        generalSupport: 'support@personalwings.com',
        phone: '+444 555 666 777',
        address: '123 Education Street, Learning City, ED 12345',
      },
      seoMeta: {
        title: 'Privacy Policy - Personal Wings',
        description:
          'Learn how Personal Wings protects your privacy and handles your personal information. Our comprehensive privacy policy explains data collection, usage, and your rights.',
        keywords: [
          'privacy policy',
          'data protection',
          'personal information',
          'GDPR compliance',
          'data security',
          'user privacy',
          'Personal Wings',
        ],
        ogTitle: 'Privacy Policy - Personal Wings',
        ogDescription:
          'Your privacy matters. Learn how we protect your data and respect your privacy rights.',
        ogImage: '',
        canonicalUrl: 'https://personalwings.com/privacy-policy',
      },
      isActive: true,
    };

    const createdPolicy = new this.privacyPolicyModel(defaultPrivacyPolicy);
    return createdPolicy.save();
  }

  async toggleActive(id: string): Promise<PrivacyPolicy> {
    const privacyPolicy = await this.findOne(id);
    if (!privacyPolicy) {
      throw new Error('Privacy policy not found');
    }

    // If activating, deactivate all others
    if (!privacyPolicy.isActive) {
      await this.privacyPolicyModel.updateMany(
        { _id: { $ne: id } },
        { isActive: false },
      );
    }

    privacyPolicy.isActive = !privacyPolicy.isActive;
    return privacyPolicy.save();
  }

  async duplicate(id: string): Promise<PrivacyPolicy> {
    const original = await this.findOne(id);
    if (!original) {
      throw new Error('Privacy policy not found');
    }

    const duplicated = new this.privacyPolicyModel({
      headerSection: { ...original.headerSection },
      lastUpdated: original.lastUpdated,
      sections: JSON.parse(JSON.stringify(original.sections)),
      contactInfo: { ...original.contactInfo },
      seoMeta: { ...original.seoMeta },
      isActive: false, // Duplicated items are inactive by default
    });

    return duplicated.save();
  }

  async export(id: string, format: 'json' | 'pdf' = 'json'): Promise<any> {
    const privacyPolicy = await this.findOne(id);
    if (!privacyPolicy) {
      throw new Error('Privacy policy not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(privacyPolicy, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      privacyPolicy,
    };
  }

  async exportAll(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const allPrivacyPolicies = await this.findAll();

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      return JSON.stringify(allPrivacyPolicies, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      privacyPolicies: allPrivacyPolicies,
    };
  }
}
