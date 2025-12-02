import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class BotActionsService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // Course Actions
  async searchCourses(query: string, filters?: any): Promise<any[]> {
    const searchRegex = new RegExp(query, 'i');
    const searchQuery: any = {
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ],
      isPublished: true,
    };

    if (filters?.category) searchQuery.category = filters.category;
    if (filters?.level) searchQuery.level = filters.level;
    if (filters?.priceRange) {
      searchQuery.price = {
        $gte: filters.priceRange.min,
        $lte: filters.priceRange.max,
      };
    }

    return this.courseModel
      .find(searchQuery)
      .select('title description price thumbnail instructor level duration')
      .limit(10)
      .sort({ enrollmentCount: -1 })
      .exec();
  }

  async getCourseDetails(courseId: string): Promise<any> {
    return this.courseModel
      .findById(courseId)
      .populate('instructor', 'firstName lastName avatar')
      .exec();
  }

  async getPopularCourses(limit = 5): Promise<any[]> {
    return this.courseModel
      .find({ isPublished: true })
      .sort({ enrollmentCount: -1, rating: -1 })
      .limit(limit)
      .select('title price thumbnail rating enrollmentCount')
      .exec();
  }

  async getRecommendedCourses(userId: string, limit = 5): Promise<any[]> {
    // Get user's enrolled courses to find similar ones
    const enrollments = await this.enrollmentModel
      .find({ student: userId })
      .populate('course')
      .exec();

    if (enrollments.length === 0) {
      return this.getPopularCourses(limit);
    }

    const categories = enrollments
      .map((e: any) => e.course?.category)
      .filter(Boolean);

    return this.courseModel
      .find({
        category: { $in: categories },
        isPublished: true,
        _id: {
          $nin: enrollments.map((e: any) => e.course?._id).filter(Boolean),
        },
      })
      .limit(limit)
      .sort({ rating: -1 })
      .exec();
  }

  // Enrollment Actions
  async checkEnrollmentStatus(userId: string, courseId: string): Promise<any> {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .exec();

    if (!enrollment) {
      return { enrolled: false, canEnroll: true };
    }

    const completedLessonsCount = enrollment.completedLessons
      ? enrollment.completedLessons.size
      : 0;

    return {
      enrolled: true,
      enrollmentDate: (enrollment as any).createdAt,
      progress: enrollment.progress || 0,
      status: enrollment.status,
      completedLessons: completedLessonsCount,
    };
  }

  async getUserEnrollments(userId: string): Promise<any[]> {
    return this.enrollmentModel
      .find({ student: userId })
      .populate('course', 'title thumbnail instructor')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getEnrollmentProgress(userId: string, courseId: string): Promise<any> {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .populate('course')
      .exec();

    if (!enrollment) {
      return { error: 'Not enrolled in this course' };
    }

    const course = (enrollment as any).course;
    const totalLessons = course?.lessons?.length || 0;
    const completedLessonsCount = enrollment.completedLessons
      ? enrollment.completedLessons.size
      : 0;
    const progress = enrollment.progress || 0;

    return {
      progress: Math.round(progress),
      completedLessons: completedLessonsCount,
      totalLessons,
      lastAccessedAt: enrollment.lastAccessedAt,
      certificateEligible: progress >= 80,
    };
  }

  // Order Actions
  async getUserOrders(userId: string, limit = 10): Promise<any[]> {
    return this.orderModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('courses', 'title')
      .exec();
  }

  async getOrderStatus(orderId: string): Promise<any> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('courses', 'title thumbnail')
      .exec();

    if (!order) {
      return { error: 'Order not found' };
    }

    return {
      orderId: order._id,
      status: order.status,
      total: order.total,
      paymentMethod: order.paymentMethod,
      courses: order.courses,
      createdAt: (order as any).createdAt,
      canRefund: this.canRequestRefund((order as any).createdAt),
    };
  }

  async getPendingOrders(userId: string): Promise<any[]> {
    return this.orderModel
      .find({ user: userId, status: { $in: ['pending', 'processing'] } })
      .populate('courses', 'title')
      .exec();
  }

  // User Actions
  async getUserProfile(userId: string): Promise<any> {
    return this.userModel
      .findById(userId)
      .select('firstName lastName email avatar bio')
      .exec();
  }

  async getUserStats(userId: string): Promise<any> {
    const [enrollments, orders, user] = await Promise.all([
      this.enrollmentModel.countDocuments({ student: userId }),
      this.orderModel.countDocuments({ user: userId }),
      this.userModel.findById(userId).select('createdAt'),
    ]);

    const completedCourses = await this.enrollmentModel.countDocuments({
      student: userId,
      progress: 100,
    });

    return {
      totalEnrollments: enrollments,
      completedCourses,
      totalOrders: orders,
      accountAge: this.calculateAccountAge((user as any)?.createdAt),
      memberSince: (user as any)?.createdAt,
    };
  }

  // Helper Actions
  async canEnrollInCourse(userId: string, courseId: string): Promise<any> {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .exec();

    if (enrollment) {
      return {
        canEnroll: false,
        reason: 'Already enrolled in this course',
        enrollment,
      };
    }

    return { canEnroll: true };
  }

  async checkCertificateEligibility(
    userId: string,
    courseId: string,
  ): Promise<any> {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .populate('course')
      .exec();

    if (!enrollment) {
      return { eligible: false, reason: 'Not enrolled in this course' };
    }

    const progress = enrollment.progress || 0;
    const requirements = {
      progressComplete: progress >= 100,
      quizPassed: enrollment.quizzesPassed >= 1,
      assignmentsComplete: enrollment.assignmentsCompleted >= 1,
    };

    const eligible =
      requirements.progressComplete &&
      requirements.quizPassed &&
      requirements.assignmentsComplete;

    return {
      eligible,
      requirements,
      progress: progress,
      quizzesPassed: enrollment.quizzesPassed,
      assignmentsCompleted: enrollment.assignmentsCompleted,
    };
  }

  // Private helpers
  private canRequestRefund(orderDate: Date): boolean {
    if (!orderDate) return false;
    const daysSinceOrder =
      (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceOrder <= 30;
  }

  private calculateAccountAge(createdAt: Date): string {
    if (!createdAt) return 'Unknown';

    const months = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
    );

    if (months < 1) return 'New member';
    if (months < 12) return `${months} month${months > 1 ? 's' : ''}`;

    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''}`;
  }

  // Search and Discovery
  async searchEverything(query: string, userId?: string): Promise<any> {
    const searchRegex = new RegExp(query, 'i');

    const [courses, instructors] = await Promise.all([
      this.courseModel
        .find({
          $or: [{ title: searchRegex }, { description: searchRegex }],
          isPublished: true,
        })
        .limit(5)
        .select('title price thumbnail')
        .exec(),

      this.userModel
        .find({
          role: 'instructor',
          $or: [{ firstName: searchRegex }, { lastName: searchRegex }],
        })
        .limit(3)
        .select('firstName lastName avatar')
        .exec(),
    ]);

    return {
      courses,
      instructors,
      totalResults: courses.length + instructors.length,
    };
  }
}
