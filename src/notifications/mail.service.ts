import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendVerificationEmail(
    email: string,
    token: string,
    code?: string,
  ): Promise<void> {
    const url = `${this.configService.get('FRONTEND_URL')}/activate-account?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Personal Wings - Email Verification',
      text: `Verify your email by visiting: ${url}`,
      template: 'email-verification',
      context: {
        verificationUrl: url,
        verificationCode: code,
        email,
        supportEmail: this.configService.get(
          'SUPPORT_EMAIL',
          'support@personalwings.com',
        ),
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${this.configService.get('FRONTEND_URL')}/forgot-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Personal Wings - Password Reset',
      template: 'password-reset',
      context: {
        url,
        email,
      },
    });
  }

  async sendWelcomeEmail(user: User): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to Personal Wings!',
      template: 'welcome',
      context: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    });
  }

  async sendCourseEnrollmentEmail(
    user: User,
    courseName: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: `Enrolled in ${courseName}`,
      template: 'course-enrollment',
      context: {
        name: `${user.firstName} ${user.lastName}`,
        courseName,
      },
    });
  }

  async sendPaymentConfirmationEmail(
    user: User,
    amount: number,
    courseName?: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Payment Confirmation - Personal Wings',
      template: 'payment-confirmation',
      context: {
        name: `${user.firstName} ${user.lastName}`,
        amount,
        courseName,
      },
    });
  }

  async sendBulkEmail(
    users: User[],
    subject: string,
    template: string,
    context: any,
  ): Promise<boolean> {
    try {
      await Promise.all(
        users.map((user) =>
          this.mailerService.sendMail({
            to: user.email,
            subject,
            template,
            context: { ...context, name: `${user.firstName} ${user.lastName}` },
          }),
        ),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendAdminAlert(
    subject: string,
    message: string,
    data?: any,
  ): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (!adminEmail) return;

    await this.mailerService.sendMail({
      to: adminEmail,
      subject: `[Admin Alert] ${subject}`,
      template: 'admin-alert',
      context: {
        subject,
        message,
        data,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async sendCertificateEmail(
    user: User,
    certificateId: string,
    courseName: string,
    certificateUrl: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: user.email,
      subject: `🎓 Congratulations! Your ${courseName} Certificate`,
      template: 'certificate',
      context: {
        name: `${user.firstName} ${user.lastName}`,
        courseName,
        certificateId,
        certificateUrl,
        year: new Date().getFullYear(),
        supportEmail: this.configService.get(
          'SUPPORT_EMAIL',
          'support@personalwings.com',
        ),
      },
    });
  }
}
