import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Order } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { LiveSession } from '../live-sessions/entities/live-session.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import {
  Transaction,
  TransactionStatus,
} from '../payments/entities/transaction.entity';
import { Payout } from '../payments/entities/payout.entity';
import { Invoice } from '../payments/entities/invoice.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { SecurityMiddleware } from '../shared/middleware/security.middleware';
import { IntegrationsService } from '../integrations/integrations.service';
import { Assignment } from '../certificates/entities/additional.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(LiveSession.name) private liveSessionModel: Model<LiveSession>,
    @InjectModel(Coupon.name) private couponModel: Model<Coupon>,
    @InjectModel(Transaction.name) private transactionModel: Model<Transaction>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>,
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    @Inject(SecurityMiddleware) private securityMiddleware: SecurityMiddleware,
    private integrationsService: IntegrationsService,
  ) { }

  // ==================== INTEGRATIONS MANAGEMENT ====================
  async getAllIntegrations() {
    return this.integrationsService.findAll();
  }

  async updateIntegration(id: string, updateData: any) {
    return this.integrationsService.update(id, updateData);
  }

  async toggleIntegrationStatus(id: string, status: boolean) {
    return this.integrationsService.toggleStatus(id, status);
  }

  // ==================== DASHBOARD OVERVIEW ====================
  async getDashboardStats(): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Total counts
    const [
      totalUsers,
      totalCourses,
      totalOrders,
      totalRevenue,
      activeEnrollments,
      totalReviews,
      thisMonthUsers,
      lastMonthUsers,
      thisMonthRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.courseModel.countDocuments().exec(),
      this.orderModel.countDocuments().exec(),
      this.orderModel
        .aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
        .exec(),
      this.enrollmentModel.countDocuments().exec(),
      this.reviewModel.countDocuments().exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: startOfMonth } })
        .exec(),
      this.userModel
        .countDocuments({
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        })
        .exec(),
      this.orderModel
        .aggregate([
          {
            $match: { status: 'completed', createdAt: { $gte: startOfMonth } },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
        .exec(),
      this.orderModel
        .aggregate([
          {
            $match: {
              status: 'completed',
              createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
        .exec(),
    ]);

    const revenue = totalRevenue[0]?.total || 0;
    const revenueThisMonth = thisMonthRevenue[0]?.total || 0;
    const revenueLastMonth = lastMonthRevenue[0]?.total || 0;

    const userGrowth =
      lastMonthUsers > 0
        ? ((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100
        : 100;

    const revenueGrowth =
      revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
        : 100;

    return {
      overview: {
        totalUsers,
        totalCourses,
        totalOrders,
        totalRevenue: revenue,
        activeEnrollments,
        totalReviews,
      },
      growth: {
        users: {
          thisMonth: thisMonthUsers,
          lastMonth: lastMonthUsers,
          growthRate: parseFloat(userGrowth.toFixed(2)),
        },
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          growthRate: parseFloat(revenueGrowth.toFixed(2)),
        },
      },
    };
  }

  // ==================== USER MANAGEMENT ====================
  async getAllUsers(filters: any): Promise<any> {
    const { page = 1, limit = 20, role, status, search } = filters;
    const query: any = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.userModel.countDocuments(query).exec();
    const users = await this.userModel
      .find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetails(userId: string): Promise<any> {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [enrollments, orders, reviews] = await Promise.all([
      this.enrollmentModel.find({ student: userId }).populate('course').exec(),
      this.orderModel.find({ user: userId }).exec(),
      this.reviewModel.find({ user: userId }).exec(),
    ]);

    const totalSpent = orders
      .filter((order) => order.status === 'completed')
      .reduce((sum, order) => sum + (order.total || 0), 0);

    return {
      user,
      stats: {
        enrolledCourses: enrollments.length,
        completedCourses: enrollments.filter((e) => e.completedAt).length,
        totalOrders: orders.length,
        totalSpent,
        totalReviews: reviews.length,
      },
      recentActivity: {
        enrollments: enrollments.slice(0, 5),
        orders: orders.slice(0, 5),
        reviews: reviews.slice(0, 5),
      },
    };
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { status }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete related data
    await Promise.all([
      this.enrollmentModel.deleteMany({ student: userId }).exec(),
      this.orderModel.deleteMany({ user: userId }).exec(),
      this.reviewModel.deleteMany({ user: userId }).exec(),
    ]);
  }

  // ==================== COURSE MANAGEMENT ====================
  async getAllCourses(filters: any): Promise<any> {
    const { page = 1, limit = 20, status, category, search } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.courseModel.countDocuments(query).exec();
    const courses = await this.courseModel
      .find(query)
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      courses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveCourse(courseId: string): Promise<Course | null> {
    const course = await this.courseModel
      .findByIdAndUpdate(
        courseId,
        { status: 'published', publishedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async rejectCourse(courseId: string, reason: string): Promise<Course | null> {
    const course = await this.courseModel
      .findByIdAndUpdate(
        courseId,
        { status: 'rejected', rejectionReason: reason },
        { new: true },
      )
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async deleteCourse(courseId: string): Promise<void> {
    const course = await this.courseModel.findByIdAndDelete(courseId).exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Cascade delete related data
    await Promise.all([
      this.enrollmentModel.deleteMany({ course: courseId }).exec(),
      this.reviewModel.deleteMany({ itemId: courseId }).exec(),
      this.quizModel.deleteMany({ course: courseId }).exec(),
      this.liveSessionModel.deleteMany({ course: courseId }).exec(),
    ]);
  }

  // ==================== ORDER MANAGEMENT ====================
  async getAllOrders(filters: any): Promise<any> {
    const { page = 1, limit = 20, status, paymentStatus } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const total = await this.orderModel.countDocuments(query).exec();
    const orders = await this.orderModel
      .find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<Order | null> {
    const order = await this.orderModel
      .findByIdAndUpdate(orderId, { status }, { new: true })
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getOrderDetails(orderId: string): Promise<Order | null> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('user', 'firstName lastName email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ==================== REVIEW MODERATION ====================
  async getPendingReviews(page = 1, limit = 20): Promise<any> {
    const query = { status: 'pending' };
    const total = await this.reviewModel.countDocuments(query).exec();
    const reviews = await this.reviewModel
      .find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approveReview(reviewId: string): Promise<Review | null> {
    const review = await this.reviewModel
      .findByIdAndUpdate(reviewId, { status: 'approved' }, { new: true })
      .exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async rejectReview(reviewId: string): Promise<Review | null> {
    const review = await this.reviewModel
      .findByIdAndUpdate(reviewId, { status: 'rejected' }, { new: true })
      .exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async deleteReview(reviewId: string): Promise<void> {
    const review = await this.reviewModel.findByIdAndDelete(reviewId).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }
  }

  // ==================== REVENUE & ANALYTICS ====================
  async getRevenueReport(startDate: Date, endDate: Date): Promise<any> {
    const orders = await this.orderModel
      .find({
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const dailyRevenue = {};
    let totalRevenue = 0;
    const totalOrders = orders.length;

    orders.forEach((order) => {
      const orderDate = (order as any).createdAt || new Date();
      const dateKey = orderDate.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (order.total || 0);
      totalRevenue += order.total || 0;
    });

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      },
      dailyRevenue,
    };
  }

  async getTopCourses(limit = 10): Promise<any> {
    const topCourses = await this.enrollmentModel
      .aggregate([
        {
          $group: {
            _id: '$course',
            enrollmentCount: { $sum: 1 },
            completionCount: {
              $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] },
            },
          },
        },
        { $sort: { enrollmentCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: '$course' },
      ])
      .exec();

    return topCourses.map((item) => ({
      courseId: item._id,
      title: item.course.title,
      enrollments: item.enrollmentCount,
      completions: item.completionCount,
      completionRate:
        item.enrollmentCount > 0
          ? parseFloat(
            ((item.completionCount / item.enrollmentCount) * 100).toFixed(2),
          )
          : 0,
    }));
  }

  async getTopInstructors(limit = 10): Promise<any> {
    const topInstructors = await this.courseModel
      .aggregate([
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'course',
            as: 'enrollments',
          },
        },
        {
          $group: {
            _id: '$instructor',
            totalCourses: { $sum: 1 },
            totalEnrollments: { $sum: { $size: '$enrollments' } },
          },
        },
        { $sort: { totalEnrollments: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'instructor',
          },
        },
        { $unwind: '$instructor' },
      ])
      .exec();

    return topInstructors.map((item) => ({
      instructorId: item._id,
      name: `${item.instructor.firstName} ${item.instructor.lastName}`,
      email: item.instructor.email,
      totalCourses: item.totalCourses,
      totalEnrollments: item.totalEnrollments,
    }));
  }

  // ==================== SYSTEM SETTINGS ====================
  async getSystemHealth(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      publishedCourses,
      pendingReviews,
      failedOrders,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ status: 'active' }).exec(),
      this.courseModel.countDocuments().exec(),
      this.courseModel.countDocuments({ status: 'published' }).exec(),
      this.reviewModel.countDocuments({ status: 'pending' }).exec(),
      this.orderModel.countDocuments({ status: 'failed' }).exec(),
    ]);

    return {
      database: {
        status: 'healthy',
        collections: {
          users: totalUsers,
          courses: totalCourses,
        },
      },
      platform: {
        activeUsers,
        publishedCourses,
        pendingReviews,
        failedOrders,
      },
      alerts: [
        ...(pendingReviews > 50 ? ['High number of pending reviews'] : []),
        ...(failedOrders > 20 ? ['High number of failed orders'] : []),
      ],
    };
  }

  async getCouponUsageStats(): Promise<any> {
    const coupons = await this.couponModel.find().exec();

    return coupons.map((coupon) => ({
      code: coupon.code,
      type: coupon.type,
      discount: coupon.value,
      used: coupon.usedCount,
      limit: coupon.maxUses,
      active: coupon.isActive,
      expiresAt: coupon.expiresAt,
    }));
  }

  // ==================== BULK OPERATIONS ====================
  async bulkUpdateUserStatus(userIds: string[], status: string): Promise<any> {
    const result = await this.userModel
      .updateMany({ _id: { $in: userIds } }, { status })
      .exec();

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} users updated successfully`,
    };
  }

  async bulkDeleteUsers(userIds: string[]): Promise<any> {
    const result = await this.userModel
      .deleteMany({ _id: { $in: userIds } })
      .exec();

    // Cascade delete related data
    await Promise.all([
      this.enrollmentModel.deleteMany({ student: { $in: userIds } }).exec(),
      this.orderModel.deleteMany({ user: { $in: userIds } }).exec(),
      this.reviewModel.deleteMany({ user: { $in: userIds } }).exec(),
    ]);

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} users deleted successfully`,
    };
  }

  // ==================== INSTRUCTOR MANAGEMENT ====================
  async getPendingInstructors(page = 1, limit = 20): Promise<any> {
    const query = { role: 'INSTRUCTOR', status: 'pending' };
    const total = await this.userModel.countDocuments(query).exec();
    const instructors = await this.userModel
      .find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      instructors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  // ==================== CONTENT MODERATION ====================
  async getFlaggedContent(page = 1, limit = 20): Promise<any> {
    const reviews = await this.reviewModel
      .find({ flagged: true })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      content: reviews,
      pagination: {
        total: await this.reviewModel.countDocuments({ flagged: true }).exec(),
        page,
        limit,
        totalPages: Math.ceil(
          (await this.reviewModel.countDocuments({ flagged: true }).exec()) /
          limit,
        ),
      },
    };
  }

  async flagContent(
    contentId: string,
    contentType: string,
    reason: string,
  ): Promise<any> {
    if (contentType === 'review') {
      await this.reviewModel
        .findByIdAndUpdate(contentId, { flagged: true, flagReason: reason })
        .exec();
    }

    return { message: 'Content flagged successfully' };
  }

  async unflagContent(contentId: string, contentType: string): Promise<any> {
    if (contentType === 'review') {
      await this.reviewModel
        .findByIdAndUpdate(contentId, {
          flagged: false,
          $unset: { flagReason: '' },
        })
        .exec();
    }

    return { message: 'Content unflagged successfully' };
  }

  // ==================== PLATFORM SETTINGS ====================
  async getPlatformStats(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30Days,
      totalCourses,
      newCourses30Days,
      totalOrders,
      newOrders30Days,
      totalRevenue,
      revenue30Days,
      activeEnrollments,
      completedEnrollments,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel
        .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        .exec(),
      this.courseModel.countDocuments().exec(),
      this.courseModel
        .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
        .exec(),
      this.orderModel.countDocuments({ status: 'completed' }).exec(),
      this.orderModel
        .countDocuments({
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo },
        })
        .exec(),
      this.orderModel
        .aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ])
        .exec(),
      this.orderModel
        .aggregate([
          {
            $match: {
              status: 'completed',
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ])
        .exec(),
      this.enrollmentModel.countDocuments({ status: 'active' }).exec(),
      this.enrollmentModel
        .countDocuments({ completedAt: { $exists: true } })
        .exec(),
    ]);

    return {
      users: {
        total: totalUsers,
        new30Days: newUsers30Days,
      },
      courses: {
        total: totalCourses,
        new30Days: newCourses30Days,
      },
      orders: {
        total: totalOrders,
        new30Days: newOrders30Days,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        last30Days: revenue30Days[0]?.total || 0,
      },
      enrollments: {
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRate:
          activeEnrollments > 0
            ? parseFloat(
              ((completedEnrollments / activeEnrollments) * 100).toFixed(2),
            )
            : 0,
      },
    };
  }

  // ==================== ACTIVITY LOGS ====================
  async getRecentActivity(limit = 50): Promise<any> {
    const [recentUsers, recentCourses, recentOrders, recentEnrollments] =
      await Promise.all([
        this.userModel
          .find()
          .select('firstName lastName email role createdAt')
          .sort({ createdAt: -1 })
          .limit(10)
          .exec(),
        this.courseModel
          .find()
          .select('title instructor status createdAt')
          .populate('instructor', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .exec(),
        this.orderModel
          .find()
          .select('user total status createdAt')
          .populate('user', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .exec(),
        this.enrollmentModel
          .find()
          .select('student course createdAt')
          .populate('student', 'firstName lastName')
          .populate('course', 'title')
          .sort({ createdAt: -1 })
          .limit(10)
          .exec(),
      ]);

    const activities = [
      ...recentUsers.map((u) => ({
        type: 'user_registration',
        description: `${u.firstName} ${u.lastName} registered as ${u.role}`,
        timestamp: (u as any).createdAt,
      })),
      ...recentCourses.map((c) => ({
        type: 'course_created',
        description: `New course "${c.title}" created`,
        timestamp: (c as any).createdAt,
      })),
      ...recentOrders.map((o) => ({
        type: 'order_placed',
        description: `Order placed for $${o.total}`,
        timestamp: (o as any).createdAt,
      })),
      ...recentEnrollments.map((e) => ({
        type: 'course_enrollment',
        description: `Student enrolled in course`,
        timestamp: (e as any).createdAt,
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // ==================== SEARCH & FILTERS ====================
  async searchAll(query: string, limit = 10): Promise<any> {
    const searchRegex = { $regex: query, $options: 'i' };

    const [users, courses, orders] = await Promise.all([
      this.userModel
        .find({
          $or: [
            { email: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
          ],
        })
        .select('-password')
        .limit(limit)
        .exec(),
      this.courseModel
        .find({
          $or: [{ title: searchRegex }, { description: searchRegex }],
        })
        .populate('instructor', 'firstName lastName')
        .limit(limit)
        .exec(),
      this.orderModel
        .find({ orderNumber: searchRegex })
        .populate('user', 'firstName lastName email')
        .limit(limit)
        .exec(),
    ]);

    return {
      users,
      courses,
      orders,
    };
  }

  // ==================== EXPORT DATA ====================
  async exportUsers(filters: any): Promise<any[]> {
    const query: any = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;

    const users = await this.userModel.find(query).select('-password').exec();

    return users.map((u) => ({
      id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      status: u.status,
      createdAt: (u as any).createdAt,
    }));
  }

  async exportOrders(startDate: Date, endDate: Date): Promise<any[]> {
    const orders = await this.orderModel
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate('user', 'email firstName lastName')
      .exec();

    return orders.map((o) => ({
      id: o._id,
      orderNumber: o.orderNumber,
      user: (o.user as any)?.email,
      total: o.total,
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: (o as any).createdAt,
    }));
  }

  // ==================== PAYMENT MANAGEMENT ====================
  async getAllTransactions(filters: any) {
    const {
      page = 1,
      limit = 10,
      status,
      method,
      search,
      startDate,
      endDate,
    } = filters;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (status) query.status = status;
    if (method) query.gateway = method;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .populate('user', 'firstName lastName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(query).exec(),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPaymentAnalytics(filters: any) {
    const { period = '30d', startDate, endDate } = filters;

    let start: Date;
    const end = endDate ? new Date(endDate) : new Date();

    if (startDate) {
      start = new Date(startDate);
    } else {
      const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);
    }

    const [revenueStats, methodBreakdown, statusBreakdown, revenueByDay] =
      await Promise.all([
        this.transactionModel
          .aggregate([
            {
              $match: {
                createdAt: { $gte: start, $lte: end },
                type: 'payment',
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0],
                  },
                },
                successfulPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                failedPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                },
                refundedPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
                },
                refundedAmount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0],
                  },
                },
              },
            },
          ])
          .exec(),
        this.transactionModel
          .aggregate([
            {
              $match: {
                createdAt: { $gte: start, $lte: end },
                status: 'completed',
              },
            },
            {
              $group: {
                _id: '$gateway',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        this.transactionModel
          .aggregate([
            {
              $match: {
                createdAt: { $gte: start, $lte: end },
              },
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ])
          .exec(),
        this.transactionModel
          .aggregate([
            {
              $match: {
                createdAt: { $gte: start, $lte: end },
                status: 'completed',
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                revenue: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .exec(),
      ]);

    const stats = revenueStats[0] || {
      totalRevenue: 0,
      successfulPayments: 0,
      failedPayments: 0,
      refundedPayments: 0,
      refundedAmount: 0,
    };

    return {
      overview: {
        totalRevenue: stats.totalRevenue,
        successfulPayments: stats.successfulPayments,
        failedPayments: stats.failedPayments,
        refundedPayments: stats.refundedPayments,
        refundedAmount: stats.refundedAmount,
        refundRate:
          stats.successfulPayments > 0
            ? (
              (stats.refundedPayments / stats.successfulPayments) *
              100
            ).toFixed(2)
            : '0.00',
      },
      methodBreakdown: methodBreakdown.map((m) => ({
        method: m._id || 'Unknown',
        total: m.total,
        count: m.count,
      })),
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r._id,
        revenue: r.revenue,
        count: r.count,
      })),
    };
  }

  async getAllInvoices(filters: any) {
    const { page = 1, limit = 10, status, search } = filters;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'billingInfo.companyName': { $regex: search, $options: 'i' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .populate('user', 'firstName lastName email avatar')
        .populate('order')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('user', 'firstName lastName email avatar phone')
      .populate('order')
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async createManualInvoice(invoiceData: any) {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${(
      (await this.invoiceModel.countDocuments()) + 1
    )
      .toString()
      .padStart(4, '0')}`;

    const invoice = await this.invoiceModel.create({
      ...invoiceData,
      invoiceNumber,
      status: 'pending',
    });

    return invoice;
  }

  async getTransactionDetails(id: string) {
    const transaction = await this.transactionModel
      .findById(id)
      .populate('user', 'firstName lastName email avatar phone')
      .populate('orderId')
      .exec();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async processRefund(transactionId: string, refundData: any) {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status === TransactionStatus.REFUNDED) {
      throw new BadRequestException('Transaction already refunded');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed transactions can be refunded',
      );
    }

    const refundAmount = refundData.amount || transaction.amount;

    transaction.status = TransactionStatus.REFUNDED;
    transaction.failureReason = refundData.reason; // Using failureReason field for refund reason
    transaction.refundedAt = new Date();
    // Note: refundAmount property doesn't exist in schema, amount remains the original
    await transaction.save();

    const order = await this.orderModel.findById(transaction.orderId);
    if (order) {
      (order as any).status = 'refunded';
      await order.save();
    }

    return {
      success: true,
      message: 'Refund processed successfully',
      refundAmount,
    };
  }

  async getInstructorPayouts(filters: any) {
    const { page = 1, limit = 10, status } = filters;
    const skip = (page - 1) * limit;

    const instructors = await this.userModel
      .find({ role: 'instructor' })
      .select('firstName lastName email avatar')
      .skip(skip)
      .limit(limit)
      .exec();

    const payouts = await Promise.all(
      instructors.map(async (instructor) => {
        const courses = await this.courseModel
          .find({ instructor: instructor._id })
          .select('title revenue');

        const totalEarnings = courses.reduce(
          (sum, course) => sum + ((course as any).revenue || 0),
          0,
        );
        const instructorShare = totalEarnings * 0.7;

        return {
          id: instructor._id,
          instructorName: `${instructor.firstName} ${instructor.lastName}`,
          email: instructor.email,
          avatar: instructor.avatar,
          courseCount: courses.length,
          totalEarnings: instructorShare,
          nextPayout: this.getNextPayoutDate(),
          status: status || 'scheduled',
        };
      }),
    );

    const total = await this.userModel.countDocuments({ role: 'instructor' });

    return {
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async processInstructorPayout(instructorId: string, payoutData: any) {
    const instructor = await this.userModel.findById(instructorId);

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    await this.transactionModel.create({
      user: instructorId,
      amount: payoutData.amount,
      currency: 'USD',
      type: 'payout',
      status: 'completed',
      description: `Instructor payout for ${payoutData.period}`,
      gateway: payoutData.method || 'bank_transfer',
      processedAt: new Date(),
    });

    return {
      success: true,
      message: 'Payout processed successfully',
      amount: payoutData.amount,
    };
  }

  async exportPaymentReport(filters: any) {
    const { format = 'csv', startDate, endDate } = filters;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const transactions = await this.transactionModel
      .find({
        createdAt: { $gte: start, $lte: end },
      })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();

    if (format === 'csv') {
      const csvData = transactions
        .map((t) => {
          const user = t.user as User;
          return [
            t.transactionId,
            user && typeof user === 'object'
              ? `${user.firstName} ${user.lastName}`
              : 'N/A',
            user && typeof user === 'object' ? user.email : 'N/A',
            t.amount,
            t.currency,
            t.status,
            t.gateway,
            (t as any).createdAt?.toISOString() || new Date().toISOString(),
          ].join(',');
        })
        .join('\n');

      const header =
        'Transaction ID,Name,Email,Amount,Currency,Status,Payment Method,Date\n';

      return {
        format: 'csv',
        data: header + csvData,
        filename: `payment-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`,
      };
    }

    return {
      format: 'json',
      data: transactions,
      filename: `payment-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json`,
    };
  }

  private getNextPayoutDate(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  }

  // ==================== SECURITY MANAGEMENT ====================
  async getBlockedIPs(): Promise<{ blockedIPs: string[] }> {
    return {
      blockedIPs: this.securityMiddleware.getBlockedIPs(),
    };
  }

  async unblockIP(ip: string): Promise<{ message: string; ip: string }> {
    if (!ip) {
      throw new BadRequestException('IP address is required');
    }
    this.securityMiddleware.unblockIP(ip);
    return {
      message: 'IP unblocked successfully',
      ip,
    };
  }

  async getWhitelistedIPs(): Promise<{ whitelistedIPs: string[] }> {
    return {
      whitelistedIPs: this.securityMiddleware.getWhitelistedIPs(),
    };
  }

  async whitelistIP(ip: string): Promise<{ message: string; ip: string }> {
    if (!ip) {
      throw new BadRequestException('IP address is required');
    }
    this.securityMiddleware.whitelistIP(ip);
    return {
      message: 'IP whitelisted successfully',
      ip,
    };
  }

  async removeFromWhitelist(
    ip: string,
  ): Promise<{ message: string; ip: string }> {
    if (!ip) {
      throw new BadRequestException('IP address is required');
    }
    this.securityMiddleware.removeFromWhitelist(ip);
    return {
      message: 'IP removed from whitelist successfully',
      ip,
    };
  }

  // ==================== INSTRUCTOR MANAGEMENT ====================

  /**
   * Get instructor statistics including courses, students, and revenue
   */
  async getInstructorStats(instructorId: string): Promise<any> {
    try {
      // Get all instructor courses
      const courses = await this.courseModel
        .find({ instructor: instructorId })
        .exec();
      const courseIds = courses.map((c) => c._id);

      // Get enrollment stats
      const enrollments = await this.enrollmentModel
        .find({ course: { $in: courseIds } })
        .exec();

      // Get revenue stats
      const revenueData = await this.orderModel
        .aggregate([
          {
            $match: {
              courses: { $in: courseIds },
              status: { $in: ['completed', 'confirmed'] },
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$total' },
              orderCount: { $sum: 1 },
            },
          },
        ])
        .exec();

      // Calculate ratings
      const totalRating = courses.reduce(
        (sum, c) => sum + (c.rating || 0) * (c.reviewCount || 0),
        0,
      );
      const totalReviews = courses.reduce(
        (sum, c) => sum + (c.reviewCount || 0),
        0,
      );
      const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

      return {
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.status === 'published')
          .length,
        draftCourses: courses.filter((c) => c.status === 'draft').length,
        totalStudents: enrollments.length,
        activeStudents: enrollments.filter((e) => e.status === 'active').length,
        completedEnrollments: enrollments.filter((e) => e.progress >= 100)
          .length,
        avgCourseRating: parseFloat(avgRating.toFixed(2)),
        totalRevenue: revenueData[0]?.totalRevenue || 0,
        totalOrders: revenueData[0]?.orderCount || 0,
        avgStudentProgress:
          enrollments.length > 0
            ? enrollments.reduce((sum, e) => sum + e.progress, 0) /
            enrollments.length
            : 0,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch instructor stats');
    }
  }

  /**
   * Approve a pending instructor
   */
  async approveInstructor(id: string): Promise<any> {
    try {
      const instructor = await this.userModel.findById(id).exec();

      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }

      if (instructor.role !== UserRole.INSTRUCTOR) {
        throw new BadRequestException('User is not an instructor');
      }

      instructor.status = UserStatus.ACTIVE;
      instructor.isActive = true;
      instructor.emailVerified = true;
      await instructor.save();

      // TODO: Send approval email notification
      // await this.emailService.sendInstructorApprovalEmail(instructor);

      return {
        message: 'Instructor approved successfully',
        instructor: instructor.toObject(),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to approve instructor');
    }
  }

  /**
   * Reject a pending instructor
   */
  async rejectInstructor(id: string, reason: string): Promise<any> {
    try {
      const instructor = await this.userModel.findById(id).exec();

      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }

      if (instructor.role !== UserRole.INSTRUCTOR) {
        throw new BadRequestException('User is not an instructor');
      }

      instructor.status = UserStatus.INACTIVE;
      instructor.isActive = false;
      await instructor.save();

      // TODO: Send rejection email with reason
      // await this.emailService.sendInstructorRejectionEmail(instructor, reason);

      return {
        message: 'Instructor rejected successfully',
        instructor: instructor.toObject(),
        reason,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to reject instructor');
    }
  }

  /**
   * Bulk delete instructors
   */
  async bulkDeleteInstructors(ids: string[]): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No instructor IDs provided');
      }

      // Verify all are instructors
      const instructors = await this.userModel
        .find({
          _id: { $in: ids },
          role: UserRole.INSTRUCTOR,
        })
        .exec();

      if (instructors.length !== ids.length) {
        throw new BadRequestException(
          'Some users are not instructors or do not exist',
        );
      }

      // Delete the instructors
      const result = await this.userModel
        .deleteMany({
          _id: { $in: ids },
          role: UserRole.INSTRUCTOR,
        })
        .exec();

      return {
        message: `${result.deletedCount} instructor(s) deleted successfully`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete instructors');
    }
  }

  /**
   * Bulk update instructor status
   */
  async bulkUpdateInstructorStatus(
    ids: string[],
    status: string,
  ): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No instructor IDs provided');
      }

      const validStatuses = [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.PENDING, UserStatus.SUSPENDED];
      if (!validStatuses.includes(status as UserStatus)) {
        throw new BadRequestException('Invalid status');
      }

      // Update instructors
      const result = await this.userModel
        .updateMany(
          {
            _id: { $in: ids },
            role: UserRole.INSTRUCTOR,
          },
          {
            $set: {
              status: status as UserStatus,
              isActive: status === UserStatus.ACTIVE,
            },
          },
        )
        .exec();

      return {
        message: `${result.modifiedCount} instructor(s) updated to ${status}`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update instructor status');
    }
  }

  /**
   * Export instructors data
   */
  async exportInstructors(filters: {
    search?: string;
    status?: string;
    specialization?: string;
    experience?: string;
  }): Promise<any> {
    try {
      const query: any = { role: UserRole.INSTRUCTOR };

      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.search) {
        query.$or = [
          { firstName: new RegExp(filters.search, 'i') },
          { lastName: new RegExp(filters.search, 'i') },
          { email: new RegExp(filters.search, 'i') },
        ];
      }
      if (filters.specialization) {
        query.specialization = filters.specialization;
      }
      if (filters.experience) {
        query.experience = filters.experience;
      }

      const instructors = await this.userModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .exec();

      // Get additional stats for each instructor
      const instructorsWithStats = await Promise.all(
        instructors.map(async (instructor) => {
          const courses = await this.courseModel
            .find({ instructor: instructor._id })
            .exec();
          const courseIds = courses.map((c) => c._id);

          const enrollmentCount = await this.enrollmentModel
            .countDocuments({
              course: { $in: courseIds },
            })
            .exec();

          const avgRating =
            courses.length > 0
              ? courses.reduce((sum, c) => sum + (c.rating || 0), 0) /
              courses.length
              : 0;

          return {
            id: instructor._id,
            firstName: instructor.firstName,
            lastName: instructor.lastName,
            email: instructor.email,
            phone: instructor.phone || '',
            status: instructor.status,
            specialization: instructor.specialization || '',
            experience: instructor.experience || '',
            country: instructor.country || '',
            coursesCount: courses.length,
            studentsCount: enrollmentCount,
            rating: avgRating.toFixed(1),
            joinedDate: instructor.createdAt,
          };
        }),
      );

      return {
        instructors: instructorsWithStats,
        total: instructorsWithStats.length,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException('Failed to export instructors');
    }
  }

  /**
   * Get instructor analytics
   */
  async getInstructorAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;

      const matchStage: any = { role: UserRole.INSTRUCTOR };
      if (startDate || endDate) {
        matchStage.createdAt = dateFilter;
      }

      // New instructor registrations over time
      const registrationTrends = await this.userModel
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      // Status distribution
      const statusDistribution = await this.userModel
        .aggregate([
          { $match: { role: UserRole.INSTRUCTOR } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      // Experience level distribution
      const experienceDistribution = await this.userModel
        .aggregate([
          { $match: { role: UserRole.INSTRUCTOR } },
          {
            $group: {
              _id: '$experience',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      return {
        registrationTrends,
        statusDistribution,
        experienceDistribution,
        summary: {
          total: await this.userModel
            .countDocuments({ role: UserRole.INSTRUCTOR })
            .exec(),
          active: await this.userModel
            .countDocuments({ role: UserRole.INSTRUCTOR, status: UserStatus.ACTIVE })
            .exec(),
          pending: await this.userModel
            .countDocuments({ role: UserRole.INSTRUCTOR, status: UserStatus.PENDING })
            .exec(),
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch instructor analytics');
    }
  }

  /**
   * Get instructor performance tiers
   */
  async getInstructorPerformanceTiers(): Promise<any> {
    try {
      const instructors = await this.userModel
        .find({ role: UserRole.INSTRUCTOR, status: UserStatus.ACTIVE })
        .select('-password')
        .exec();

      const performanceData = await Promise.all(
        instructors.map(async (instructor) => {
          const stats = await this.getInstructorStats(
            (instructor as any)._id.toString(),
          );

          // Calculate performance score (0-100)
          const ratingScore = (stats.avgCourseRating / 5) * 30; // 30% weight
          const completionScore =
            stats.totalStudents > 0
              ? (stats.completedEnrollments / stats.totalStudents) * 25
              : 0; // 25% weight
          const studentCountScore = Math.min(stats.totalStudents / 10, 1) * 20; // 20% weight
          const courseCountScore = Math.min(stats.publishedCourses / 5, 1) * 15; // 15% weight
          const progressScore = (stats.avgStudentProgress / 100) * 10; // 10% weight

          const totalScore =
            ratingScore +
            completionScore +
            studentCountScore +
            courseCountScore +
            progressScore;

          // Determine tier
          let tier: string;
          if (totalScore >= 80) tier = 'top';
          else if (totalScore >= 60) tier = 'strong';
          else if (totalScore >= 40) tier = 'average';
          else tier = 'needs_support';

          return {
            instructorId: instructor._id,
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
            score: parseFloat(totalScore.toFixed(2)),
            tier,
            stats,
          };
        }),
      );

      // Group by tiers
      const tiers = {
        top: performanceData.filter((p) => p.tier === 'top'),
        strong: performanceData.filter((p) => p.tier === 'strong'),
        average: performanceData.filter((p) => p.tier === 'average'),
        needs_support: performanceData.filter(
          (p) => p.tier === 'needs_support',
        ),
      };

      const total = performanceData.length;

      return {
        tiers,
        summary: {
          total,
          topPerformers: tiers.top.length,
          topPerformersPercentage:
            total > 0 ? Math.round((tiers.top.length / total) * 100) : 0,
          strongPerformers: tiers.strong.length,
          strongPerformersPercentage:
            total > 0 ? Math.round((tiers.strong.length / total) * 100) : 0,
          averagePerformers: tiers.average.length,
          averagePerformersPercentage:
            total > 0 ? Math.round((tiers.average.length / total) * 100) : 0,
          needsSupport: tiers.needs_support.length,
          needsSupportPercentage:
            total > 0
              ? Math.round((tiers.needs_support.length / total) * 100)
              : 0,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch instructor performance tiers',
      );
    }
  }

  // ==================== STUDENT MANAGEMENT ====================

  /**
   * Get student statistics
   */
  async getStudentStats(): Promise<any> {
    try {
      const totalStudents = await this.userModel
        .countDocuments({ role: UserRole.STUDENT })
        .exec();

      const activeStudents = await this.userModel
        .countDocuments({ role: UserRole.STUDENT, status: UserStatus.ACTIVE })
        .exec();

      const inactiveStudents = await this.userModel
        .countDocuments({ role: UserRole.STUDENT, status: UserStatus.INACTIVE })
        .exec();

      const pendingStudents = await this.userModel
        .countDocuments({ role: UserRole.STUDENT, status: UserStatus.PENDING })
        .exec();

      const suspendedStudents = await this.userModel
        .countDocuments({ role: UserRole.STUDENT, status: UserStatus.SUSPENDED })
        .exec();

      // Get enrollment stats
      const enrollmentStats = await this.enrollmentModel
        .aggregate([
          {
            $group: {
              _id: null,
              totalEnrollments: { $sum: 1 },
              avgProgress: { $avg: '$progress' },
              completedCourses: {
                $sum: { $cond: [{ $gte: ['$progress', 100] }, 1, 0] },
              },
            },
          },
        ])
        .exec();

      // Get quiz stats
      const quizStats = await this.quizModel
        .aggregate([
          {
            $unwind: '$submissions',
          },
          {
            $group: {
              _id: null,
              avgScore: { $avg: '$submissions.score' },
            },
          },
        ])
        .exec();

      return {
        totalStudents,
        activeStudents,
        inactiveStudents,
        pendingStudents,
        suspendedStudents,
        avgCompletion: enrollmentStats[0]?.avgProgress || 0,
        avgScore: quizStats[0]?.avgScore || 0,
        totalEnrollments: enrollmentStats[0]?.totalEnrollments || 0,
        completedCourses: enrollmentStats[0]?.completedCourses || 0,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch student stats');
    }
  }

  /**
   * Get student progress
   */
  async getStudentProgress(studentId: string): Promise<any> {
    try {
      const student = await this.userModel.findById(studentId).exec();

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (student.role !== UserRole.STUDENT) {
        throw new BadRequestException('User is not a student');
      }

      const enrollments = await this.enrollmentModel
        .find({ student: studentId })
        .populate('course', 'title category instructor thumbnail')
        .sort({ createdAt: -1 })
        .exec();

      const totalEnrollments = enrollments.length;
      const completed = enrollments.filter((e) => e.progress >= 100).length;
      const inProgress = enrollments.filter(
        (e) => e.progress > 0 && e.progress < 100,
      ).length;
      const avgProgress =
        enrollments.reduce((sum, e) => sum + e.progress, 0) /
        totalEnrollments || 0;
      const totalTimeSpent = enrollments.reduce(
        (sum, e) => sum + (e.totalTimeSpent || 0),
        0,
      );

      // Get quiz scores for this student
      const quizzes = await this.quizModel
        .find({
          'submissions.student': studentId,
        })
        .exec();

      const quizScores: number[] = [];
      quizzes.forEach((quiz) => {
        quiz.submissions.forEach((sub: any) => {
          if (sub.student.toString() === studentId) {
            quizScores.push(sub.score);
          }
        });
      });

      const avgScore =
        quizScores.length > 0
          ? quizScores.reduce((sum, score) => sum + score, 0) /
          quizScores.length
          : 0;

      // Get recent activity
      const recentActivity = await this.activityLogModel
        .find({ user: studentId })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      return {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
        },
        summary: {
          totalEnrollments,
          completed,
          inProgress,
          avgProgress: Math.round(avgProgress),
          totalTimeSpent: Math.round(totalTimeSpent),
          avgScore: Math.round(avgScore),
        },
        enrollments: enrollments.map((e) => ({
          course: e.course,
          progress: e.progress,
          status: e.status,
          lastAccessed: e.lastAccessedAt,
          timeSpent: e.totalTimeSpent || 0,
          quizScores: quizScores,
          avgQuizScore: avgScore,
        })),
        recentActivity: recentActivity.map((activity) => ({
          type: activity.action,
          description: activity.details,
          timestamp: activity.createdAt,
        })),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch student progress');
    }
  }

  /**
   * Get detailed student stats
   */
  async getStudentDetailedStats(studentId: string): Promise<any> {
    try {
      const student = await this.userModel.findById(studentId).exec();

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const enrollments = await this.enrollmentModel
        .find({ student: studentId })
        .exec();

      const courseIds = enrollments.map((e) => e.course);

      // Get quiz submissions
      const quizzes = await this.quizModel
        .find({
          course: { $in: courseIds },
          'submissions.student': studentId,
        })
        .exec();

      const quizScores: number[] = [];
      let totalQuizzes = 0;
      let passedQuizzes = 0;

      quizzes.forEach((quiz) => {
        quiz.submissions.forEach((sub: any) => {
          if (sub.student.toString() === studentId) {
            quizScores.push(sub.score);
            totalQuizzes++;
            if (sub.score >= quiz.passingScore) {
              passedQuizzes++;
            }
          }
        });
      });

      // Get assignment submissions
      const assignments = await this.assignmentModel
        .find({
          course: { $in: courseIds },
          'submissions.student': studentId,
        })
        .exec();

      let totalAssignments = 0;
      let submittedAssignments = 0;
      let gradedAssignments = 0;
      const assignmentScores: number[] = [];

      assignments.forEach((assignment) => {
        assignment.submissions.forEach((sub: any) => {
          if (sub.student.toString() === studentId) {
            totalAssignments++;
            submittedAssignments++;
            if (sub.grade !== undefined && sub.grade !== null) {
              gradedAssignments++;
              assignmentScores.push(sub.grade);
            }
          }
        });
      });

      return {
        enrollments: {
          total: enrollments.length,
          completed: enrollments.filter((e) => e.progress >= 100).length,
          inProgress: enrollments.filter(
            (e) => e.progress > 0 && e.progress < 100,
          ).length,
          notStarted: enrollments.filter((e) => e.progress === 0).length,
          avgProgress:
            enrollments.reduce((sum, e) => sum + e.progress, 0) /
            enrollments.length || 0,
        },
        quizzes: {
          total: totalQuizzes,
          passed: passedQuizzes,
          avgScore:
            quizScores.length > 0
              ? quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length
              : 0,
          scores: quizScores,
        },
        assignments: {
          total: totalAssignments,
          submitted: submittedAssignments,
          graded: gradedAssignments,
          avgGrade:
            assignmentScores.length > 0
              ? assignmentScores.reduce((sum, s) => sum + s, 0) /
              assignmentScores.length
              : 0,
        },
        timeSpent: {
          total: enrollments.reduce(
            (sum, e) => sum + (e.totalTimeSpent || 0),
            0,
          ),
          avg:
            enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0) /
            enrollments.length || 0,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch student detailed stats');
    }
  }

  /**
   * Bulk delete students
   */
  async bulkDeleteStudents(ids: string[]): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No student IDs provided');
      }

      // Verify all are students
      const students = await this.userModel
        .find({
          _id: { $in: ids },
          role: UserRole.STUDENT,
        })
        .exec();

      if (students.length !== ids.length) {
        throw new BadRequestException(
          'Some users are not students or do not exist',
        );
      }

      // Delete the students
      const result = await this.userModel
        .deleteMany({
          _id: { $in: ids },
          role: UserRole.STUDENT,
        })
        .exec();

      return {
        message: `${result.deletedCount} student(s) deleted successfully`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete students');
    }
  }

  /**
   * Bulk update student status
   */
  async bulkUpdateStudentStatus(ids: string[], status: string): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No student IDs provided');
      }

      const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
      if (!validStatuses.includes(status)) {
        throw new BadRequestException('Invalid status');
      }

      // Update students
      const result = await this.userModel
        .updateMany(
          {
            _id: { $in: ids },
            role: UserRole.STUDENT,
          },
          {
            $set: {
              status,
              isActive: status === 'active',
            },
          },
        )
        .exec();

      return {
        message: `${result.modifiedCount} student(s) updated to ${status}`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update student status');
    }
  }

  /**
   * Export students data
   */
  async exportStudents(filters: {
    search?: string;
    status?: string;
    course?: string;
    country?: string;
  }): Promise<any> {
    try {
      const query: any = { role: UserRole.STUDENT };

      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.search) {
        query.$or = [
          { firstName: new RegExp(filters.search, 'i') },
          { lastName: new RegExp(filters.search, 'i') },
          { email: new RegExp(filters.search, 'i') },
        ];
      }
      if (filters.country) {
        query.country = filters.country;
      }

      const students = await this.userModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .exec();

      // Get additional stats for each student
      const studentsWithStats = await Promise.all(
        students.map(async (student) => {
          const enrollments = await this.enrollmentModel
            .find({ student: student._id })
            .exec();

          const avgProgress =
            enrollments.length > 0
              ? enrollments.reduce((sum, e) => sum + e.progress, 0) /
              enrollments.length
              : 0;

          const completedCourses = enrollments.filter(
            (e) => e.progress >= 100,
          ).length;

          return {
            id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone || '',
            status: student.status,
            country: student.country || '',
            enrolledCourses: enrollments.length,
            completedCourses,
            avgProgress: avgProgress.toFixed(1),
            joinedDate: student.createdAt,
          };
        }),
      );

      return {
        students: studentsWithStats,
        total: studentsWithStats.length,
        exportDate: new Date().toISOString(),
      };
    } catch (error) {
      throw new BadRequestException('Failed to export students');
    }
  }

  /**
   * Import students
   */
  async importStudents(
    students: any[],
    sendWelcomeEmail: boolean = false,
  ): Promise<any> {
    try {
      if (!students || students.length === 0) {
        throw new BadRequestException('No students provided');
      }

      let imported = 0;
      let skipped = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const studentData of students) {
        try {
          // Check if student already exists
          const existing = await this.userModel
            .findOne({ email: studentData.email })
            .exec();

          if (existing) {
            skipped++;
            continue;
          }

          // Create student
          await this.userModel.create({
            ...studentData,
            role: UserRole.STUDENT,
            status: studentData.status || 'active',
            isActive: true,
            emailVerified: false,
          });

          imported++;

          // TODO: Send welcome email if requested
          // if (sendWelcomeEmail) {
          //   await this.emailService.sendWelcomeEmail(student);
          // }
        } catch (error) {
          failed++;
          errors.push(
            `Failed to import ${studentData.email}: ${error.message}`,
          );
        }
      }

      return {
        message: `Import completed: ${imported} imported, ${skipped} skipped, ${failed} failed`,
        imported,
        skipped,
        failed,
        errors: errors.slice(0, 10), // Return first 10 errors
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to import students');
    }
  }

  /**
   * Send broadcast email to students
   */
  async sendBroadcastToStudents(params: {
    subject: string;
    message: string;
    studentIds?: string[];
    courseId?: string;
  }): Promise<any> {
    try {
      let students: any[];

      if (params.studentIds && params.studentIds.length > 0) {
        // Send to specific students
        students = await this.userModel
          .find({
            _id: { $in: params.studentIds },
            role: UserRole.STUDENT,
          })
          .exec();
      } else if (params.courseId) {
        // Send to all students in a course
        const enrollments = await this.enrollmentModel
          .find({ course: params.courseId })
          .populate('student')
          .exec();
        students = enrollments.map((e) => e.student);
      } else {
        // Send to all students
        students = await this.userModel
          .find({ role: UserRole.STUDENT, status: 'active' })
          .exec();
      }

      // TODO: Implement actual email sending
      // For now, just return the count
      // await this.emailService.sendBulkEmail(students, params.subject, params.message);

      return {
        message: `Broadcast email queued for ${students.length} students`,
        queued: students.length,
      };
    } catch (error) {
      throw new BadRequestException('Failed to send broadcast email');
    }
  }

  /**
   * Send message to student
   */
  async sendMessageToStudent(
    studentId: string,
    subject: string,
    message: string,
    type: 'email' | 'notification' | 'both' = 'email',
  ): Promise<any> {
    try {
      const student = await this.userModel.findById(studentId).exec();

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      if (student.role !== UserRole.STUDENT) {
        throw new BadRequestException('User is not a student');
      }

      // TODO: Implement actual email/notification sending
      // if (type === 'email' || type === 'both') {
      //   await this.emailService.sendEmail(student.email, subject, message);
      // }
      // if (type === 'notification' || type === 'both') {
      //   await this.notificationService.send(studentId, subject, message);
      // }

      return {
        message: `Message sent to ${student.email}`,
        success: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to send message');
    }
  }

  /**
   * Get student analytics
   */
  async getStudentAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;

      const matchStage: any = { role: UserRole.STUDENT };
      if (startDate || endDate) {
        matchStage.createdAt = dateFilter;
      }

      // New student registrations over time
      const registrationTrends = await this.userModel
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      // Status distribution
      const statusDistribution = await this.userModel
        .aggregate([
          { $match: { role: UserRole.STUDENT } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      // Country distribution
      const countryDistribution = await this.userModel
        .aggregate([
          {
            $match: {
              role: UserRole.STUDENT,
              country: { $exists: true, $ne: '' },
            },
          },
          {
            $group: {
              _id: '$country',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .exec();

      return {
        registrationTrends,
        statusDistribution,
        countryDistribution,
        summary: {
          total: await this.userModel
            .countDocuments({ role: UserRole.STUDENT })
            .exec(),
          active: await this.userModel
            .countDocuments({ role: UserRole.STUDENT, status: 'active' })
            .exec(),
          pending: await this.userModel
            .countDocuments({ role: UserRole.STUDENT, status: 'pending' })
            .exec(),
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch student analytics');
    }
  }

  /**
   * Get student performance tiers
   */
  async getStudentPerformanceTiers(): Promise<any> {
    try {
      const students = await this.userModel
        .find({ role: UserRole.STUDENT, status: 'active' })
        .select('-password')
        .exec();

      const performanceData = await Promise.all(
        students.map(async (student) => {
          const enrollments = await this.enrollmentModel
            .find({ student: student._id })
            .exec();

          const avgCompletion =
            enrollments.length > 0
              ? enrollments.reduce((sum, e) => sum + e.progress, 0) /
              enrollments.length
              : 0;

          const completedCourses = enrollments.filter(
            (e) => e.progress >= 100,
          ).length;

          const totalTimeSpent = enrollments.reduce(
            (sum, e) => sum + (e.totalTimeSpent || 0),
            0,
          );

          // Get quiz scores
          const quizzes = await this.quizModel
            .find({
              'submissions.student': student._id,
            })
            .exec();

          const quizScores: number[] = [];
          quizzes.forEach((quiz) => {
            quiz.submissions.forEach((sub: any) => {
              if (sub.student.toString() === (student._id as any).toString()) {
                quizScores.push(sub.score);
              }
            });
          });

          const avgScore =
            quizScores.length > 0
              ? quizScores.reduce((sum, s) => sum + s, 0) / quizScores.length
              : 0;

          // Calculate performance score (0-100)
          const completionScore = avgCompletion * 0.4; // 40% weight
          const scoreWeight = avgScore * 0.3; // 30% weight
          const enrollmentScore = Math.min(enrollments.length / 5, 1) * 20; // 20% weight
          const completedScore = Math.min(completedCourses / 3, 1) * 10; // 10% weight

          const totalScore =
            completionScore + scoreWeight + enrollmentScore + completedScore;

          // Determine tier
          let tier: string;
          if (totalScore >= 80) tier = 'excellent';
          else if (totalScore >= 60) tier = 'good';
          else if (totalScore >= 40) tier = 'average';
          else tier = 'needs_improvement';

          return {
            studentId: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            score: parseFloat(totalScore.toFixed(2)),
            tier,
            stats: {
              avgCompletion: Math.round(avgCompletion),
              avgScore: Math.round(avgScore),
              enrollmentCount: enrollments.length,
              completedCourses,
              activeTime: Math.round(totalTimeSpent),
            },
          };
        }),
      );

      // Group by tiers
      const tiers = {
        excellent: performanceData.filter((p) => p.tier === 'excellent'),
        good: performanceData.filter((p) => p.tier === 'good'),
        average: performanceData.filter((p) => p.tier === 'average'),
        needs_improvement: performanceData.filter(
          (p) => p.tier === 'needs_improvement',
        ),
      };

      const total = performanceData.length;

      return {
        tiers,
        summary: {
          total,
          excellentCount: tiers.excellent.length,
          excellentPercentage:
            total > 0 ? Math.round((tiers.excellent.length / total) * 100) : 0,
          goodCount: tiers.good.length,
          goodPercentage:
            total > 0 ? Math.round((tiers.good.length / total) * 100) : 0,
          averageCount: tiers.average.length,
          averagePercentage:
            total > 0 ? Math.round((tiers.average.length / total) * 100) : 0,
          needsImprovementCount: tiers.needs_improvement.length,
          needsImprovementPercentage:
            total > 0
              ? Math.round((tiers.needs_improvement.length / total) * 100)
              : 0,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch student performance tiers',
      );
    }
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Get users stats
   */
  async getUsersStats(): Promise<any> {
    try {
      const [
        totalUsers,
        activeUsers,
        inactiveUsers,
        students,
        instructors,
        admins,
        recentUsers,
      ] = await Promise.all([
        this.userModel.countDocuments().exec(),
        this.userModel.countDocuments({ isActive: true }).exec(),
        this.userModel.countDocuments({ isActive: false }).exec(),
        this.userModel.countDocuments({ role: UserRole.STUDENT }).exec(),
        this.userModel.countDocuments({ role: UserRole.INSTRUCTOR }).exec(),
        this.userModel
          .countDocuments({
            role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
          })
          .exec(),
        this.userModel
          .countDocuments({
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          })
          .exec(),
      ]);

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        students,
        instructors,
        admins,
        recentUsers,
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch user stats');
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;

      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.createdAt = dateFilter;
      }

      // Registration trends
      const registrationTrends = await this.userModel
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      // Role distribution
      const roleDistribution = await this.userModel
        .aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      // Status distribution
      const statusDistribution = await this.userModel
        .aggregate([
          {
            $group: {
              _id: { isActive: '$isActive', status: '$status' },
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      // Active users over time
      const activeUsersOverTime = await this.userModel
        .aggregate([
          { $match: { lastLogin: { $exists: true } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ])
        .exec();

      return {
        registrationTrends,
        roleDistribution,
        statusDistribution,
        activeUsersOverTime,
        summary: {
          total: await this.userModel.countDocuments().exec(),
          active: await this.userModel
            .countDocuments({ isActive: true })
            .exec(),
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch user analytics');
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get recent activity logs
      const activities = await this.activityLogModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();

      // Get enrollments
      const enrollments = await this.enrollmentModel
        .find({ student: userId })
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      // Get orders
      const orders = await this.orderModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      // Get reviews
      const reviews = await this.reviewModel
        .find({ user: userId })
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .exec();

      return {
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
        },
        activities: activities.map((a: any) => ({
          action: a.action,
          details: a.details,
          timestamp: a.createdAt,
        })),
        enrollments: enrollments.map((e: any) => ({
          course: e.course,
          progress: e.progress,
          status: e.status,
          enrolledAt: (e as any).createdAt,
        })),
        orders: orders.map((o: any) => ({
          id: o._id,
          total: o.total,
          status: o.status,
          createdAt: (o as any).createdAt,
        })),
        reviews: reviews.map((r: any) => ({
          course: (r as any).course,
          rating: r.rating,
          comment: r.comment,
          createdAt: (r as any).createdAt,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch user activity');
    }
  }

  /**
   * Bulk activate users
   */
  async bulkActivateUsers(ids: string[]): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No user IDs provided');
      }

      const result = await this.userModel
        .updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              isActive: true,
              status: 'active',
            },
          },
        )
        .exec();

      return {
        message: `${result.modifiedCount} user(s) activated successfully`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to activate users');
    }
  }

  /**
   * Bulk deactivate users
   */
  async bulkDeactivateUsers(ids: string[]): Promise<any> {
    try {
      if (!ids || ids.length === 0) {
        throw new BadRequestException('No user IDs provided');
      }

      const result = await this.userModel
        .updateMany(
          { _id: { $in: ids } },
          {
            $set: {
              isActive: false,
              status: 'inactive',
            },
          },
        )
        .exec();

      return {
        message: `${result.modifiedCount} user(s) deactivated successfully`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to deactivate users');
    }
  }

  /**
   * Bulk delete users
   */
  // Duplicate method removed; implementation exists earlier in the file

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // TODO: Implement actual email sending
      // await this.emailService.sendVerificationEmail(user.email);

      return {
        message: 'Verification email sent successfully',
        email: user.email,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to send verification email');
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId).exec();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Hash the new password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      await user.save();

      // TODO: Send password reset confirmation email
      // await this.emailService.sendPasswordResetConfirmation(user.email);

      return {
        message: 'Password reset successfully',
        userId: user._id,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password');
    }
  }

  /**
   * Export users
   */
  // Duplicate method removed; implementation exists earlier in the file

  /**
   * Get role distribution
   */
  async getRoleDistribution(): Promise<any> {
    try {
      const distribution = await this.userModel
        .aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
              },
            },
          },
          { $sort: { count: -1 } },
        ])
        .exec();

      return {
        distribution,
        total: await this.userModel.countDocuments().exec(),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch role distribution');
    }
  }

  /**
   * Get activity summary
   */
  async getActivitySummary(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [newUsers, activeUsers, totalLogins] = await Promise.all([
        this.userModel
          .countDocuments({
            createdAt: { $gte: startDate },
          })
          .exec(),
        this.userModel
          .countDocuments({
            lastLogin: { $gte: startDate },
          })
          .exec(),
        this.activityLogModel
          .countDocuments({
            action: 'login',
            createdAt: { $gte: startDate },
          })
          .exec(),
      ]);

      // Get daily active users
      const dailyActiveUsers = await this.userModel
        .aggregate([
          {
            $match: {
              lastLogin: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$lastLogin' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec();

      return {
        period: `Last ${days} days`,
        newUsers,
        activeUsers,
        totalLogins,
        dailyActiveUsers,
        avgActivePerDay: Math.round(activeUsers / days),
      };
    } catch (error) {
      throw new BadRequestException('Failed to fetch activity summary');
    }
  }
}
