import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Certificate } from './entities/additional.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { MailService } from '../notifications/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectModel(Certificate.name) private certificateModel: Model<Certificate>,
    @InjectModel(CertificateTemplate.name)
    private templateModel: Model<CertificateTemplate>,
    private mailService: MailService,
  ) {}

  async generateCertificate(
    userId: string,
    courseId: string,
  ): Promise<Certificate> {
    // Check if certificate already exists
    const existing = await this.certificateModel.findOne({
      student: userId,
      course: courseId,
    });

    if (existing) {
      return existing;
    }

    // Generate unique certificate ID
    const certificateId = this.generateCertificateId();
    const certificateUrl = `${process.env.FRONTEND_URL}/certificates/${certificateId}`;

    const certificate = new this.certificateModel({
      student: userId,
      course: courseId,
      certificateId,
      issuedAt: new Date(),
      certificateUrl,
    });

    return await certificate.save();
  }

  async getUserCertificates(userId: string): Promise<Certificate[]> {
    const certificates = await this.certificateModel
      .find({ student: userId })
      .populate('course', 'title instructor')
      .populate('student', 'firstName lastName')
      .sort({ issuedAt: -1 })
      .exec();

    // Ensure all certificates have issuedAt (for backward compatibility)
    for (const cert of certificates) {
      if (!cert.issuedAt) {
        cert.issuedAt = (cert as any).createdAt || new Date();
        await cert.save();
      }
    }

    return certificates;
  }

  async verifyCertificate(certificateId: string): Promise<Certificate | null> {
    return this.certificateModel
      .findOne({ certificateId })
      .populate('course', 'title')
      .populate('student', 'firstName lastName')
      .exec();
  }

  async getCertificate(id: string): Promise<Certificate> {
    const certificate = await this.certificateModel
      .findById(id)
      .populate('course')
      .populate('student', 'firstName lastName email');

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  private generateCertificateId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  async getCourseCertificates(courseId: string): Promise<Certificate[]> {
    return this.certificateModel
      .find({ course: courseId })
      .populate('student', 'firstName lastName email')
      .sort({ issuedAt: -1 })
      .exec();
  }

  // Admin: Generate certificate for a specific user and course
  async adminGenerateCertificate(
    userId: string,
    courseId: string,
    sendEmail = false,
  ): Promise<Certificate> {
    // Check if certificate already exists
    let certificate = await this.certificateModel
      .findOne({
        student: userId,
        course: courseId,
      })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');

    if (!certificate) {
      // Generate unique certificate ID
      const certificateId = this.generateCertificateId();
      const certificateUrl = `${process.env.FRONTEND_URL}/certificates/${certificateId}`;

      certificate = new this.certificateModel({
        student: userId,
        course: courseId,
        certificateId,
        issuedAt: new Date(),
        certificateUrl,
        emailSent: false,
      });

      certificate = await certificate.save();
      certificate = await certificate.populate(
        'student',
        'firstName lastName email',
      );
      certificate = await certificate.populate('course', 'title');
    }

    // Send email if requested
    if (sendEmail && !certificate.emailSent) {
      await this.sendCertificateEmail(certificate);
    }

    return certificate;
  }

  // Send certificate via email
  async sendCertificateEmail(certificate: any): Promise<void> {
    const student = certificate.student;
    const course = certificate.course;

    if (!student || !course) {
      throw new BadRequestException(
        'Certificate must have student and course populated',
      );
    }

    const studentName =
      typeof student === 'object'
        ? `${student.firstName} ${student.lastName}`
        : 'Student';
    const studentEmail = typeof student === 'object' ? student.email : '';
    const courseName = typeof course === 'object' ? course.title : 'Course';

    if (!studentEmail) {
      throw new BadRequestException('Student email not found');
    }

    await this.mailService.sendCertificateEmail(
      student,
      certificate.certificateId,
      courseName,
      certificate.certificateUrl || '',
    );

    // Update certificate email status
    await this.certificateModel.findByIdAndUpdate(certificate._id, {
      emailSent: true,
      emailSentAt: new Date(),
    });
  }

  // Admin: Send certificate email for existing certificate
  async adminSendCertificateEmail(certificateId: string): Promise<void> {
    const certificate = await this.certificateModel
      .findById(certificateId)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title');

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    await this.sendCertificateEmail(certificate);
  }

  // Admin: Bulk generate certificates for all students in a course
  async adminBulkGenerateCertificates(
    courseId: string,
    userIds: string[],
    sendEmail = false,
  ): Promise<Certificate[]> {
    const certificates: Certificate[] = [];

    for (const userId of userIds) {
      try {
        const cert = await this.adminGenerateCertificate(
          userId,
          courseId,
          sendEmail,
        );
        certificates.push(cert);
      } catch (error) {
        console.error(
          `Failed to generate certificate for user ${userId}:`,
          error,
        );
      }
    }

    return certificates;
  }

  // Template Management Methods
  async getTemplates(userId: string): Promise<CertificateTemplate[]> {
    return this.templateModel
      .find({
        $or: [{ createdBy: userId }, { isActive: true }],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async createTemplate(
    createTemplateDto: CreateTemplateDto,
    userId: string,
  ): Promise<CertificateTemplate> {
    const template = new this.templateModel({
      ...createTemplateDto,
      createdBy: userId,
    });

    return template.save();
  }

  async updateTemplate(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<CertificateTemplate> {
    const template = await this.templateModel.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if user owns the template or is admin
    if (template.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    Object.assign(template, updateTemplateDto);
    return template.save();
  }

  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.templateModel.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if user owns the template
    if (template.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.templateModel.findByIdAndDelete(id);
  }

  // Template Configuration Methods
  async saveTemplateConfig(config: any, userId: string): Promise<any> {
    // Store the configuration in the user's template
    // Find or create a configuration template for this user
    let template = await this.templateModel.findOne({
      createdBy: userId,
      name: 'Certificate Configuration',
    });

    if (!template) {
      // Create a new template specifically for storing configuration
      template = new this.templateModel({
        name: 'Certificate Configuration',
        description: 'Certificate template configuration and styling',
        createdBy: userId,
        config: config,
        elements: [],
        thumbnail: '',
        isActive: true,
      });
    } else {
      // Update existing template configuration
      template.config = config;
      template.isActive = true; // Ensure it's active
    }

    await template.save();

    return {
      success: true,
      message: 'Template configuration saved successfully',
      config,
      templateId: template._id,
    };
  }

  async getTemplateConfig(userId: string): Promise<any> {
    // Look for the user's configuration template
    const template = await this.templateModel.findOne({
      createdBy: userId,
      name: 'Certificate Configuration',
      isActive: true,
    });

    if (!template || !template.config) {
      // Return default configuration with all styling options
      return {
        namePosition: { x: 50, y: 45 },
        barcodePosition: { x: 15, y: 75 },
        nameStyle: {
          fontSize: 32,
          color: '#dc2626',
          fontWeight: '600',
        },
        barcodeStyle: {
          fontSize: 14,
          color: '#000000',
          width: 2,
          height: 50,
          displayWidth: 200,
          displayHeight: 80,
        },
      };
    }

    return template.config;
  }

  // Certificate Revocation
  async revokeCertificate(
    certificateId: string,
    adminId: string,
    reason?: string,
  ): Promise<Certificate> {
    const certificate = await this.certificateModel.findById(certificateId);

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (certificate.isRevoked) {
      throw new BadRequestException('Certificate is already revoked');
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedBy = adminId as any;
    certificate.revocationReason = reason || 'No reason provided';

    return certificate.save();
  }

  async restoreCertificate(certificateId: string): Promise<Certificate> {
    const certificate = await this.certificateModel.findById(certificateId);

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (!certificate.isRevoked) {
      throw new BadRequestException('Certificate is not revoked');
    }

    certificate.isRevoked = false;
    certificate.revokedAt = undefined;
    certificate.revokedBy = undefined;
    certificate.revocationReason = undefined;

    return certificate.save();
  }

  // Search and filter certificates
  async searchCertificates(
    query: string,
    filters?: {
      courseId?: string;
      status?: 'issued' | 'revoked' | 'expired';
      startDate?: Date;
      endDate?: Date;
    },
    page = 1,
    limit = 20,
  ): Promise<{ certificates: Certificate[]; total: number }> {
    const queryBuilder: any = {};

    // Text search
    if (query) {
      queryBuilder.$or = [{ certificateId: { $regex: query, $options: 'i' } }];
    }

    // Filter by course
    if (filters?.courseId) {
      queryBuilder.course = filters.courseId;
    }

    // Filter by status
    if (filters?.status) {
      if (filters.status === 'revoked') {
        queryBuilder.isRevoked = true;
      } else if (filters.status === 'issued') {
        queryBuilder.isRevoked = false;
      } else if (filters.status === 'expired') {
        queryBuilder.expiryDate = { $lt: new Date() };
        queryBuilder.isRevoked = false;
      }
    }

    // Filter by date range
    if (filters?.startDate || filters?.endDate) {
      queryBuilder.issuedAt = {};
      if (filters.startDate) {
        queryBuilder.issuedAt.$gte = filters.startDate;
      }
      if (filters.endDate) {
        queryBuilder.issuedAt.$lte = filters.endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [certificates, total] = await Promise.all([
      this.certificateModel
        .find(queryBuilder)
        .populate('student', 'firstName lastName email')
        .populate('course', 'title')
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.certificateModel.countDocuments(queryBuilder),
    ]);

    return { certificates, total };
  }

  // Get certificate statistics
  async getCertificateStats(userId?: string): Promise<any> {
    const matchQuery: any = {};
    if (userId) {
      matchQuery.student = userId;
    }

    const [
      totalIssued,
      totalRevoked,
      totalExpired,
      recentCertificates,
      topCourses,
    ] = await Promise.all([
      this.certificateModel.countDocuments({
        ...matchQuery,
        isRevoked: false,
      }),
      this.certificateModel.countDocuments({ ...matchQuery, isRevoked: true }),
      this.certificateModel.countDocuments({
        ...matchQuery,
        isRevoked: false,
        expiryDate: { $lt: new Date() },
      }),
      this.certificateModel
        .find({ ...matchQuery, isRevoked: false })
        .sort({ issuedAt: -1 })
        .limit(10)
        .populate('student', 'firstName lastName')
        .populate('course', 'title')
        .exec(),
      this.certificateModel.aggregate([
        { $match: { ...matchQuery, isRevoked: false } },
        { $group: { _id: '$course', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        { $unwind: '$courseDetails' },
        {
          $project: {
            courseId: '$_id',
            courseName: '$courseDetails.title',
            count: 1,
          },
        },
      ]),
    ]);

    return {
      totalIssued,
      totalRevoked,
      totalExpired,
      recentCertificates,
      topCourses,
    };
  }
}
