import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  ) {}

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
}
