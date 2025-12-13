import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { Order } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';
import { Quiz } from '../quizzes/entities/quiz.entity';
import { LiveSession } from '../live-sessions/entities/live-session.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Transaction, TransactionStatus } from '../payments/entities/transaction.entity';
import { Invoice } from '../payments/entities/invoice.entity';
import { SecurityMiddleware } from '../shared/middleware/security.middleware';

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
    @Inject(SecurityMiddleware) private securityMiddleware: SecurityMiddleware,
  ) { }

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

  async approveInstructor(userId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { status: 'active', approvedAt: new Date() },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Instructor not found');
    }

    return user;
  }

  async rejectInstructor(userId: string, reason: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { status: 'rejected', rejectionReason: reason },
        { new: true },
      )
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Instructor not found');
    }

    return user;
  }

  async getInstructorStats(instructorId: string): Promise<any> {
    const [courses, totalEnrollments, totalRevenue, avgRating] =
      await Promise.all([
        this.courseModel.find({ instructor: instructorId }).exec(),
        this.enrollmentModel
          .countDocuments({
            course: {
              $in: await this.courseModel
                .find({ instructor: instructorId })
                .distinct('_id'),
            },
          })
          .exec(),
        this.orderModel
          .aggregate([
            {
              $match: {
                status: 'completed',
                'items.instructorId': instructorId,
              },
            },
            { $group: { _id: null, total: { $sum: '$total' } } },
          ])
          .exec(),
        this.reviewModel
          .aggregate([
            {
              $match: {
                itemId: {
                  $in: await this.courseModel
                    .find({ instructor: instructorId })
                    .distinct('_id'),
                },
              },
            },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
          ])
          .exec(),
      ]);

    return {
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.status === 'published').length,
      totalEnrollments,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageRating: avgRating[0]?.avgRating || 0,
      courses: courses.map((c) => ({
        id: c._id,
        title: c.title,
        status: c.status,
        enrollmentCount: 0, // Will be populated separately if needed
      })),
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
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] },
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
                  $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0] },
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
        refundRate: stats.successfulPayments > 0
          ? ((stats.refundedPayments / stats.successfulPayments) * 100).toFixed(2)
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
      throw new BadRequestException('Only completed transactions can be refunded');
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

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
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
            user && typeof user === 'object' ? `${user.firstName} ${user.lastName}` : 'N/A',
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
}
