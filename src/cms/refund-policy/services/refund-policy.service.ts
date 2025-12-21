import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefundPolicy } from '../schemas/refund-policy.schema';
import {
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
} from '../dto/refund-policy.dto';

@Injectable()
export class RefundPolicyService {
  constructor(
    @InjectModel(RefundPolicy.name)
    private refundPolicyModel: Model<RefundPolicy>,
  ) { }

  async create(
    createRefundPolicyDto: CreateRefundPolicyDto,
  ): Promise<RefundPolicy> {
    const createdRefundPolicy = new this.refundPolicyModel(
      createRefundPolicyDto,
    );
    return createdRefundPolicy.save();
  }

  async findAll(): Promise<RefundPolicy[]> {
    return this.refundPolicyModel.find().exec();
  }

  async findActive(): Promise<RefundPolicy | null> {
    return this.refundPolicyModel.findOne({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<RefundPolicy | null> {
    return this.refundPolicyModel.findById(id).exec();
  }

  async update(
    id: string,
    updateRefundPolicyDto: UpdateRefundPolicyDto,
  ): Promise<RefundPolicy | null> {
    return this.refundPolicyModel
      .findByIdAndUpdate(id, updateRefundPolicyDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<RefundPolicy | null> {
    return this.refundPolicyModel.findByIdAndDelete(id).exec();
  }

  async getOrCreateDefault(): Promise<RefundPolicy> {
    const existing = await this.refundPolicyModel.findOne().exec();
    if (existing) {
      return existing;
    }

    const defaultData: CreateRefundPolicyDto = {
      headerSection: {
        title: 'Refund Policy',
        subtitle:
          'Our commitment to your satisfaction with clear refund guidelines',
        image: '',
        imageAlt: '',
      },
      lastUpdated: 'November 17, 2025',
      sections: [
        {
          id: 'introduction',
          title: '1. Introduction',
          content: [
            'At Personal Wings, we are committed to providing high-quality educational content and ensuring your satisfaction. This Refund Policy outlines the circumstances under which refunds may be requested and the procedures for processing such requests.',
            'By purchasing courses or services on our platform, you acknowledge that you have read, understood, and agree to be bound by this Refund Policy.',
          ],
          subsections: [],
          isActive: true,
          order: 1,
        },
        {
          id: 'money-back-guarantee',
          title: '2. 30-Day Money-Back Guarantee',
          content: [
            'We offer a 30-day money-back guarantee for most courses on our platform. If you are not satisfied with your purchase, you may request a full refund within 30 days of your purchase date, provided you meet the eligibility criteria outlined below.',
          ],
          subsections: [
            {
              title: 'Eligibility Requirements:',
              content: [
                'The refund request must be made within 30 days of purchase',
                'You have completed less than 30% of the course content',
                'You have not downloaded excessive course materials',
                'You have not violated our Terms and Conditions',
                'The course was not purchased during a promotional sale (unless otherwise stated)',
              ],
            },
          ],
          isActive: true,
          order: 2,
        },
        {
          id: 'refund-process',
          title: '3. How to Request a Refund',
          content: ['To request a refund, please follow these steps:'],
          subsections: [
            {
              title: 'Step 1: Contact Support',
              content: [
                'Email our support team at support@personalwings.com with your order details and reason for the refund request.',
              ],
            },
            {
              title: 'Step 2: Provide Information',
              content: [
                "Include your full name, email address, course name, order number, and a brief explanation of why you're requesting a refund.",
              ],
            },
            {
              title: 'Step 3: Review Process',
              content: [
                'Our team will review your request within 3-5 business days and respond with a decision.',
              ],
            },
            {
              title: 'Step 4: Refund Processing',
              content: [
                'If approved, your refund will be processed within 7-10 business days to your original payment method.',
              ],
            },
          ],
          isActive: true,
          order: 3,
        },
        {
          id: 'non-refundable',
          title: '4. Non-Refundable Items and Services',
          content: [
            'The following purchases are not eligible for refunds under any circumstances:',
          ],
          subsections: [
            {
              title: 'Non-Refundable Items:',
              content: [
                'Courses or content accessed beyond 30% completion',
                'Courses purchased more than 30 days ago',
                'Live sessions, webinars, or workshops after they have occurred',
                'Certification fees and examination costs',
                'One-on-one coaching or mentoring sessions that have been conducted',
                'Promotional bundles or discounted packages (unless specified otherwise)',
                'Courses obtained through free coupons or vouchers',
                'Corporate or bulk licenses purchased for organizations',
              ],
            },
          ],
          isActive: true,
          order: 4,
        },
        {
          id: 'partial-refunds',
          title: '5. Partial Refunds',
          content: [
            'In certain exceptional circumstances, we may offer partial refunds at our discretion. These situations may include:',
          ],
          subsections: [
            {
              title: 'Partial Refund Situations:',
              content: [
                'Technical issues that significantly impacted course access',
                'Substantial content discrepancies from course descriptions',
                'Instructor unavailability for interactive course components',
                'Platform errors that affected your learning experience',
              ],
            },
          ],
          isActive: true,
          order: 5,
        },
        {
          id: 'refund-method',
          title: '6. Refund Method and Timeline',
          content: [
            'All approved refunds will be processed using the following guidelines:',
          ],
          subsections: [
            {
              title: 'Processing Timeline:',
              content: [
                'Credit/Debit Cards: 7-10 business days',
                'PayPal: 3-5 business days',
                'Bank Transfers: 10-14 business days',
              ],
            },
          ],
          isActive: true,
          order: 6,
        },
        {
          id: 'course-access',
          title: '7. Course Access After Refund',
          content: ['Once a refund is approved and processed:'],
          subsections: [
            {
              title: 'Access Removal:',
              content: [
                'You will immediately lose access to the course content',
                'All course materials, including downloads, must be deleted',
                'Certificates of completion will be revoked if issued',
                'You will be unenrolled from the course automatically',
                'Any progress or notes within the course will be permanently removed',
              ],
            },
          ],
          isActive: true,
          order: 7,
        },
        {
          id: 'abuse-policy',
          title: '8. Refund Abuse Policy',
          content: [
            'Personal Wings reserves the right to refuse refund requests from users who demonstrate patterns of abuse, including but not limited to:',
          ],
          subsections: [
            {
              title: 'Abuse Indicators:',
              content: [
                'Repeatedly purchasing and refunding courses',
                'Completing significant portions of courses before requesting refunds',
                'Downloading excessive course materials before refund requests',
                'Sharing course content with others before requesting refunds',
                'Making false or fraudulent refund claims',
              ],
            },
          ],
          isActive: true,
          order: 8,
        },
        {
          id: 'exceptions',
          title: '9. Exceptions and Special Circumstances',
          content: [
            'We understand that special circumstances may arise. In the following situations, please contact our support team to discuss your options:',
          ],
          subsections: [
            {
              title: 'Special Circumstances:',
              content: [
                'Medical emergencies or serious health issues',
                'Technical difficulties preventing course access (documented)',
                'Course content significantly differs from description',
                'Duplicate purchases made by error',
                'Unauthorized purchases on your account',
              ],
            },
          ],
          isActive: true,
          order: 9,
        },
        {
          id: 'policy-changes',
          title: '10. Changes to This Refund Policy',
          content: [
            'Personal Wings reserves the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting to our website. Your continued use of our services after changes are posted constitutes acceptance of the updated policy.',
            'We recommend reviewing this policy periodically to stay informed of any updates.',
          ],
          subsections: [],
          isActive: true,
          order: 10,
        },
      ],
      contactInfo: {
        refundDepartment: 'refunds@personalwings.com',
        generalSupport: 'support@personalwings.com',
        phone: '+444 555 666 777',
        businessHours: 'Monday - Friday, 9:00 AM - 6:00 PM (EST)',
        address: '123 Education Street, Learning City, ED 12345',
      },
      seoMeta: {
        title: 'Refund Policy - Personal Wings',
        description:
          'Learn about Personal Wings refund policy, 30-day money-back guarantee, and how to request refunds for courses and services.',
        keywords: [
          'refund policy',
          'money-back guarantee',
          'course refunds',
          'personal wings',
          'refund process',
          'course cancellation',
        ],
        ogTitle: 'Refund Policy - Personal Wings',
        ogDescription:
          'Our commitment to your satisfaction with clear refund guidelines and 30-day money-back guarantee.',
        ogImage: '',
        canonicalUrl: 'https://personalwings.com/refund-policy',
      },
      isActive: true,
    };

    const createdRefundPolicy = new this.refundPolicyModel(defaultData);
    return createdRefundPolicy.save();
  }

  async toggleActive(id: string): Promise<RefundPolicy> {
    const refundPolicy = await this.findOne(id);
    if (!refundPolicy) {
      throw new Error('Refund policy not found');
    }

    // If activating, deactivate all others
    if (!refundPolicy.isActive) {
      await this.refundPolicyModel.updateMany(
        { _id: { $ne: id } },
        { isActive: false },
      );
    }

    refundPolicy.isActive = !refundPolicy.isActive;
    return refundPolicy.save();
  }

  async duplicate(id: string): Promise<RefundPolicy> {
    const original = await this.findOne(id);
    if (!original) {
      throw new Error('Refund policy not found');
    }

    const duplicated = new this.refundPolicyModel({
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
    const refundPolicy = await this.findOne(id);
    if (!refundPolicy) {
      throw new Error('Refund policy not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(refundPolicy, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      refundPolicy,
    };
  }

  async exportAll(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const allRefundPolicies = await this.findAll();

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      return JSON.stringify(allRefundPolicies, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      refundPolicies: allRefundPolicies,
    };
  }
}
