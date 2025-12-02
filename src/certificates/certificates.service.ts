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
    return this.certificateModel
      .find({ student: userId })
      .populate('course', 'title instructor')
      .populate('student', 'firstName lastName')
      .sort({ issuedAt: -1 })
      .exec();
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
}
