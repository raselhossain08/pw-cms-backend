import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationType,
  NotificationStatus,
} from './entities/notification.entity';
import { MailService } from './mail.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private mailService: MailService,
  ) {}

  async createNotification(
    notificationData: Partial<Notification>,
  ): Promise<Notification> {
    const notification = new this.notificationModel(notificationData);
    return await notification.save();
  }

  async sendNotification(notificationData: {
    user: string | Types.ObjectId | User;
    type: NotificationType;
    title: string;
    message: string;
    template?: string;
    data?: Record<string, any>;
    actionUrl?: string;
    actionText?: string;
    priority?: string;
  }): Promise<Notification> {
    const userId =
      typeof notificationData.user === 'string'
        ? new Types.ObjectId(notificationData.user)
        : notificationData.user;

    const notification = await this.createNotification({
      ...notificationData,
      user: userId,
    });

    try {
      switch (notificationData.type) {
        case NotificationType.EMAIL:
          await this.sendEmailNotification(notification);
          break;

        case NotificationType.IN_APP:
          await this.sendInAppNotification(notification);
          break;

        case NotificationType.PUSH:
          await this.sendPushNotification(notification);
          break;

        case NotificationType.SMS:
          await this.sendSmsNotification(notification);
          break;

        default:
          this.logger.warn(
            `Unsupported notification type: ${notificationData.type}`,
          );
      }

      notification.status = NotificationStatus.SENT;
      notification.sentAt = new Date();
      await notification.save();

      this.logger.log(`Notification sent successfully: ${notification.id}`);
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.errorMessage = error.message;
      await notification.save();

      this.logger.error(`Failed to send notification: ${error.message}`);
    }

    return notification;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ notifications: Notification[]; total: number }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ user: userId }),
    ]);

    return { notifications, total };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();
    notification.status = NotificationStatus.READ;

    return await notification.save();
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { user: userId, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
    });
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      user: userId,
    });

    if (result.deletedCount === 0) {
      throw new Error('Notification not found');
    }
  }

  async sendBulkNotifications(
    notificationsData: Partial<Notification>[],
  ): Promise<{ success: number; failed: number }> {
    const results = { success: 0, failed: 0 };

    for (const data of notificationsData) {
      try {
        await this.sendNotification(data as any);
        results.success++;
      } catch (error) {
        this.logger.error(`Failed to send bulk notification: ${error.message}`);
        results.failed++;
      }
    }

    return results;
  }

  async getNotificationStats(userId?: string): Promise<any> {
    const matchStage: any = {};
    if (userId) {
      matchStage.user = new Types.ObjectId(userId);
    }

    const stats = await this.notificationModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] },
          },
          read: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
    ]);

    return stats;
  }

  // Private methods for different notification types
  private async sendEmailNotification(
    notification: Notification,
  ): Promise<void> {
    // This would integrate with the mail service
    const user = await this.getUser(notification.user);

    if (!user) {
      throw new Error('User not found for email notification');
    }

    const emailSent = await this.mailService.sendBulkEmail(
      [user],
      notification.title,
      notification.template || 'default',
      {
        ...notification.data,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        firstName: user.firstName,
      },
    );

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await notification.save();
  }

  private async sendInAppNotification(
    notification: Notification,
  ): Promise<void> {
    // In-app notifications are stored in the database and delivered via WebSocket
    // The delivery status is updated when the client acknowledges receipt
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await notification.save();
  }

  private async sendPushNotification(
    notification: Notification,
  ): Promise<void> {
    // This would integrate with push notification services (Firebase, OneSignal, etc.)
    // For now, we'll simulate successful delivery
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await notification.save();
  }

  private async sendSmsNotification(notification: Notification): Promise<void> {
    // This would integrate with SMS services (Twilio, etc.)
    // For now, we'll simulate successful delivery
    notification.status = NotificationStatus.DELIVERED;
    notification.deliveredAt = new Date();
    await notification.save();
  }

  private async getUser(user: any): Promise<User | null> {
    // This would fetch the user from the database
    // For now, return a mock user
    return {
      id: user.toString(),
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Example',
    } as any;
  }

  // Template-based notification methods
  async sendWelcomeNotification(userId: string): Promise<Notification> {
    return this.sendNotification({
      user: userId,
      type: NotificationType.EMAIL,
      title: 'Welcome to Personal Wings!',
      message:
        "Thank you for joining our aviation training platform. We're excited to help you advance your career.",
      template: 'welcome',
      priority: 'high',
    });
  }

  async sendCourseEnrollmentNotification(
    userId: string,
    course: any,
  ): Promise<Notification> {
    return this.sendNotification({
      user: userId,
      type: NotificationType.EMAIL,
      title: `Course Enrollment: ${course.title}`,
      message: `You have been successfully enrolled in "${course.title}". Start your learning journey now!`,
      template: 'course-enrollment',
      data: { course },
      actionUrl: `/courses/${course.slug}`,
      actionText: 'Start Learning',
      priority: 'high',
    });
  }

  async sendPaymentSuccessNotification(
    userId: string,
    order: any,
  ): Promise<Notification> {
    return this.sendNotification({
      user: userId,
      type: NotificationType.EMAIL,
      title: `Payment Successful - Order ${order.orderNumber}`,
      message: `Your payment of $${order.total} has been processed successfully.`,
      template: 'payment-success',
      data: { order },
      actionUrl: `/orders/${order.orderNumber}`,
      actionText: 'View Order',
      priority: 'high',
    });
  }

  async sendCertificateEarnedNotification(
    userId: string,
    course: any,
    certificateUrl: string,
  ): Promise<Notification> {
    return this.sendNotification({
      user: userId,
      type: NotificationType.EMAIL,
      title: `Certificate Earned - ${course.title}`,
      message: `Congratulations! You have successfully completed "${course.title}" and earned a certificate.`,
      template: 'certificate-earned',
      data: { course, certificateUrl },
      actionUrl: certificateUrl,
      actionText: 'Download Certificate',
      priority: 'high',
    });
  }
}
