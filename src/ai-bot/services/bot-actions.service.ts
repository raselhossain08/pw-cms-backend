import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { CreateCourseDto } from '../../courses/dto/create-course.dto';
import { CreateBlogDto } from '../../cms/home/blog/dto/blog.dto';
import {
  CourseStatus,
  CourseLevel,
  CourseType,
} from '../../courses/entities/course.entity';
import { Blog, BlogDocument } from '../../cms/home/blog/schemas/blog.schema';

@Injectable()
export class BotActionsService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) { }

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

  // ============================================
  // SUPER ADMIN ACTIONS
  // ============================================

  // Admin - User Management
  async getAllUsers(filters?: {
    role?: string;
    limit?: number;
    skip?: number;
    search?: string;
    registeredAfter?: Date;
    registeredBefore?: Date;
  }): Promise<any> {
    const query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    if (filters?.registeredAfter || filters?.registeredBefore) {
      query.createdAt = {};
      if (filters.registeredAfter)
        query.createdAt.$gte = filters.registeredAfter;
      if (filters.registeredBefore)
        query.createdAt.$lte = filters.registeredBefore;
    }

    const users = await this.userModel
      .find(query)
      .select('firstName lastName email role avatar createdAt lastLogin')
      .limit(filters?.limit || 50)
      .skip(filters?.skip || 0)
      .sort({ createdAt: -1 })
      .exec();

    const total = await this.userModel.countDocuments(query);

    return {
      users,
      total,
      showing: users.length,
    };
  }

  async getUsersRegisteredToday(): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const users = await this.userModel
      .find({ createdAt: { $gte: today } })
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return {
      count: users.length,
      users,
      date: today.toISOString(),
    };
  }

  async getUsersRegisteredThisWeek(): Promise<any> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const users = await this.userModel
      .find({ createdAt: { $gte: weekAgo } })
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return {
      count: users.length,
      users,
      period: '7 days',
    };
  }

  async getUsersRegisteredThisMonth(): Promise<any> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const users = await this.userModel
      .find({ createdAt: { $gte: monthStart } })
      .select('firstName lastName email role createdAt')
      .sort({ createdAt: -1 })
      .exec();

    return {
      count: users.length,
      users,
      period: 'this month',
    };
  }

  // Admin - Course Management
  async getAllCourses(filters?: {
    status?: string;
    category?: string;
    limit?: number;
  }): Promise<any> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.category) query.category = filters.category;

    const courses = await this.courseModel
      .find(query)
      .populate('instructor', 'firstName lastName')
      .limit(filters?.limit || 50)
      .sort({ createdAt: -1 })
      .exec();

    return {
      courses,
      count: courses.length,
    };
  }

  // Note: Use the existing createCourse, updateCourse, deleteCourse methods below
  // They include all required fields, slug generation, and proper permission checks

  // Admin - Order Management
  async getAllOrders(filters?: {
    status?: string;
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) query.createdAt.$lte = filters.dateTo;
    }

    const orders = await this.orderModel
      .find(query)
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title price')
      .limit(filters?.limit || 50)
      .sort({ createdAt: -1 })
      .exec();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );

    return {
      orders,
      count: orders.length,
      totalRevenue,
    };
  }

  async getPendingOrdersAdmin(): Promise<any> {
    const orders = await this.orderModel
      .find({ status: { $in: ['pending', 'processing'] } })
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title')
      .sort({ createdAt: -1 })
      .exec();

    return {
      orders,
      count: orders.length,
    };
  }

  // Admin - Analytics
  async getPlatformAnalytics(period?: string): Promise<any> {
    let dateFilter: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setDate(now.getDate() - 30));
        break;
      default:
        dateFilter = new Date(now.setDate(now.getDate() - 30));
    }

    const [totalUsers, newUsers, totalCourses, totalOrders, totalRevenue] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ createdAt: { $gte: dateFilter } }),
        this.courseModel.countDocuments(),
        this.orderModel.countDocuments({ createdAt: { $gte: dateFilter } }),
        this.orderModel.aggregate([
          { $match: { createdAt: { $gte: dateFilter }, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
      ]);

    const revenue = totalRevenue[0]?.total || 0;

    return {
      period: period || 'last 30 days',
      totalUsers,
      newUsers,
      totalCourses,
      totalOrders,
      revenue,
      timestamp: new Date().toISOString(),
    };
  }

  async getRevenueReport(days: number = 30): Promise<any> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const orders = await this.orderModel
      .find({
        createdAt: { $gte: dateFrom },
        status: 'completed',
      })
      .select('total createdAt')
      .sort({ createdAt: -1 })
      .exec();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );
    const averageOrderValue =
      orders.length > 0 ? totalRevenue / orders.length : 0;

    return {
      period: `Last ${days} days`,
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      orders: orders.slice(0, 10), // Return only top 10
    };
  }

  // Admin - Blog Management
  async createBlogPost(blogData: any): Promise<any> {
    try {
      const blog = new this.blogModel({
        ...blogData,
        createdAt: new Date(),
      });

      await blog.save();

      return {
        success: true,
        blog,
        message: `Blog post "${blogData.title}" created successfully!`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getAllBlogPosts(filters?: { limit?: number }): Promise<any> {
    const blogs = await this.blogModel
      .find()
      .limit(filters?.limit || 50)
      .sort({ createdAt: -1 })
      .exec();

    return {
      blogs,
      count: blogs.length,
    };
  }

  // Admin - System Health
  async getSystemHealth(): Promise<any> {
    const [userCount, courseCount, orderCount, enrollmentCount] =
      await Promise.all([
        this.userModel.countDocuments(),
        this.courseModel.countDocuments(),
        this.orderModel.countDocuments(),
        this.enrollmentModel.countDocuments(),
      ]);

    return {
      status: 'healthy',
      database: 'connected',
      collections: {
        users: userCount,
        courses: courseCount,
        orders: orderCount,
        enrollments: enrollmentCount,
      },
      timestamp: new Date().toISOString(),
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

  // ADMIN ACTIONS - Course Creation
  async createCourse(courseData: any, userId: string): Promise<any> {
    try {
      const cleanTitle = (courseData.title || 'Untitled Course')
        .toLowerCase()
        .trim();
      let slug =
        courseData.slug ||
        this.generateSlug(courseData.title || 'untitled-course');

      // Ensure unique slug
      const baseSlug = slug;
      let counter = 1;
      while (await this.courseModel.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const course = new this.courseModel({
        title: courseData.title || 'Untitled Course',
        slug,
        description: courseData.description || '',
        content: courseData.content,
        level: courseData.level || CourseLevel.BEGINNER,
        type: courseData.type || CourseType.COMBINED,
        price: courseData.price || 0,
        originalPrice: courseData.originalPrice,
        isFree: courseData.isFree || courseData.price === 0,
        duration: courseData.duration || courseData.durationHours || 10,
        durationHours: courseData.durationHours || courseData.duration || 10,
        maxStudents: courseData.maxStudents,
        tags: courseData.tags || [],
        categories: courseData.categories || [],
        prerequisites: courseData.prerequisites || [],
        learningObjectives: courseData.learningObjectives || [],
        thumbnail: courseData.thumbnail,
        status: courseData.status || CourseStatus.DRAFT,
        isPublished: courseData.isPublished || false,
        instructor: new Types.ObjectId(userId),
      });

      const savedCourse = await course.save();
      return {
        success: true,
        message: `Course "${savedCourse.title}" created successfully!`,
        course: {
          id: savedCourse._id,
          title: savedCourse.title,
          slug: savedCourse.slug,
          status: savedCourse.status,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create course',
      };
    }
  }

  // ADMIN ACTIONS - Blog Creation
  async createBlog(blogData: any): Promise<any> {
    try {
      const blog = new this.blogModel({
        title: blogData.title || 'New Blog Post',
        subtitle: blogData.subtitle || '',
        description: blogData.description || '',
        blogs: blogData.blogs || [
          {
            title: blogData.title || 'New Blog Post',
            excerpt: blogData.excerpt || '',
            content: blogData.content || '',
            slug: this.generateSlug(blogData.title || 'new-blog-post'),
            image: blogData.image,
            featured: blogData.featured || false,
            author: blogData.author || {
              name: 'AI Assistant',
              role: 'Content Creator',
              avatar: '',
            },
            publishedAt: new Date().toISOString(),
            tags: blogData.tags || [],
          },
        ],
        seo: blogData.seo || {
          title: blogData.title || 'New Blog Post',
          description: blogData.description || '',
        },
        isActive: blogData.isActive !== false,
      });

      const savedBlog = await blog.save();
      return {
        success: true,
        message: `Blog "${savedBlog.title}" created successfully!`,
        blog: {
          id: savedBlog._id,
          title: savedBlog.title,
          isActive: savedBlog.isActive,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create blog',
      };
    }
  }

  // ADMIN ACTIONS - Update Course
  async updateCourse(
    courseId: string,
    updateData: any,
    userId: string,
  ): Promise<any> {
    try {
      const course = await this.courseModel.findById(courseId).exec();
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check if user has permission (instructor or admin)
      const user = await this.userModel.findById(userId).exec();
      if (
        !user ||
        (user.role !== 'admin' &&
          user.role !== 'super_admin' &&
          !course.instructors.map(id => id.toString()).includes(userId))
      ) {
        return { success: false, error: 'Permission denied' };
      }

      Object.assign(course, updateData);
      await course.save();

      return {
        success: true,
        message: `Course "${course.title}" updated successfully!`,
        course: {
          id: course._id,
          title: course.title,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update course',
      };
    }
  }

  // ADMIN ACTIONS - Delete Course
  async deleteCourse(courseId: string, userId: string): Promise<any> {
    try {
      const course = await this.courseModel.findById(courseId).exec();
      if (!course) {
        return { success: false, error: 'Course not found' };
      }

      // Check permission
      const user = await this.userModel.findById(userId).exec();
      if (
        !user ||
        (user.role !== 'admin' &&
          user.role !== 'super_admin' &&
          !course.instructors.map(id => id.toString()).includes(userId))
      ) {
        return { success: false, error: 'Permission denied' };
      }

      await this.courseModel.findByIdAndDelete(courseId).exec();
      return {
        success: true,
        message: `Course "${course.title}" deleted successfully!`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete course',
      };
    }
  }

  // ADMIN ACTIONS - List all courses (for admin)
  async getAllCoursesAdmin(filters?: any): Promise<any> {
    try {
      const query: any = {};
      if (filters?.status) query.status = filters.status;
      if (filters?.search) {
        query.$or = [
          { title: new RegExp(filters.search, 'i') },
          { description: new RegExp(filters.search, 'i') },
        ];
      }

      const courses = await this.courseModel
        .find(query)
        .populate('instructor', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(filters?.limit || 50)
        .exec();

      return {
        success: true,
        courses: courses.map((c: any) => ({
          id: c._id,
          title: c.title,
          slug: c.slug,
          status: c.status,
          price: c.price,
          instructor: c.instructor,
        })),
        total: courses.length,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch courses',
      };
    }
  }

  // Helper: Generate slug from title
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }
}
