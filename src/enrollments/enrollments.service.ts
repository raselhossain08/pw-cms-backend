import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import {
  CreateEnrollmentDto,
  CreateEnrollmentAdminDto,
} from './dto/create-enrollment.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
  ) { }

  async enroll(
    createEnrollmentDto: CreateEnrollmentDto,
    userId: string,
  ): Promise<Enrollment> {
    // Check if already enrolled
    const existing = await this.enrollmentModel.findOne({
      student: userId,
      course: createEnrollmentDto.courseId,
    });

    if (existing) {
      throw new BadRequestException('Already enrolled in this course');
    }

    // Check if course exists and if it's free
    const course = await this.courseModel.findById(
      createEnrollmentDto.courseId,
    );
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // For paid courses without order, require payment
    if (!course.isFree && course.price > 0 && !createEnrollmentDto.orderId) {
      throw new ForbiddenException(
        'This is a paid course. Please purchase it first.',
      );
    }

    // Determine access type and payment info
    const isPaidCourse = !course.isFree && course.price > 0;
    const hasOrder = !!createEnrollmentDto.orderId;

    const enrollment = new this.enrollmentModel({
      student: userId,
      course: createEnrollmentDto.courseId,
      order: createEnrollmentDto.orderId,
      lastAccessedAt: new Date(),
      purchaseDate: hasOrder ? new Date() : undefined,
      accessType: isPaidCourse && hasOrder ? 'paid' : 'free',
      amountPaid: isPaidCourse && hasOrder ? course.price : 0,
      paymentStatus: hasOrder ? 'completed' : 'completed',
      hasAccess: true,
    });

    return await enrollment.save();
  }

  async getEnrollment(
    courseId: string,
    userId: string,
  ): Promise<Enrollment | null> {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .populate('course')
      .populate('certificate')
      .exec();

    if (!enrollment) {
      return null;
    }

    // Convert to JSON and back to ensure Maps are serialized to objects
    const enrollmentObj = enrollment.toJSON();

    return enrollmentObj as any;
  }

  async getUserEnrollments(
    userId: string,
    status?: EnrollmentStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ enrollments: Enrollment[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = { student: userId };
    if (status) filter.status = status;

    const [enrollments, total] = await Promise.all([
      this.enrollmentModel
        .find(filter)
        .populate({
          path: 'course',
          select: 'title slug description thumbnail price level type status duration rating reviewCount studentCount instructor category totalLessons',
          populate: {
            path: 'instructor',
            select: 'firstName lastName email avatar',
          },
        })
        .populate('certificate')
        .sort({ lastAccessedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.enrollmentModel.countDocuments(filter),
    ]);

    return { enrollments, total };
  }

  async updateProgress(
    courseId: string,
    updateProgressDto: UpdateProgressDto,
    userId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel
      .findOne({
        student: userId,
        course: courseId,
      })
      .populate('course');

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    const { lessonId, progress, completed, timeSpent } = updateProgressDto;

    // Update lesson-specific data
    if (progress !== undefined) {
      enrollment.lessonProgress.set(lessonId, progress);
    }

    if (completed !== undefined) {
      enrollment.completedLessons.set(lessonId, completed);
    }

    enrollment.lastAccessedLessons.set(lessonId, new Date());
    enrollment.lastAccessedAt = new Date();

    if (timeSpent) {
      enrollment.totalTimeSpent += Math.round(timeSpent / 60);
    }

    // Calculate overall progress using actual completed count
    const completedCount = Array.from(
      enrollment.completedLessons.values(),
    ).filter(Boolean).length;

    // Get total lessons from the course
    const course = enrollment.course as any;
    const totalLessons = course?.totalLessons || enrollment.completedLessons.size;

    if (totalLessons > 0) {
      enrollment.progress = Math.round((completedCount / totalLessons) * 100);
    }

    console.log('[EnrollmentsService] Progress update:', {
      lessonId,
      completed,
      completedCount,
      totalLessons,
      calculatedProgress: enrollment.progress,
      completedLessonsMap: Object.fromEntries(enrollment.completedLessons),
    });

    // Check if course is completed
    if (enrollment.progress === 100 && !enrollment.completedAt) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }

    const saved = await enrollment.save();

    // Return serialized object to ensure Maps are converted
    return saved.toJSON() as any;
  }

  async getCourseEnrollments(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ enrollments: Enrollment[]; total: number; stats: any }> {
    const skip = (page - 1) * limit;

    const [enrollments, total, stats] = await Promise.all([
      this.enrollmentModel
        .find({ course: courseId })
        .populate('student', 'firstName lastName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.enrollmentModel.countDocuments({ course: courseId }),
      this.getEnrollmentStats(courseId),
    ]);

    return { enrollments, total, stats };
  }

  async getEnrollmentStats(courseId: string): Promise<any> {
    const stats = await this.enrollmentModel.aggregate([
      { $match: { course: new Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          activeEnrollments: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.ACTIVE] }, 1, 0],
            },
          },
          completedEnrollments: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.COMPLETED] }, 1, 0],
            },
          },
          averageProgress: { $avg: '$progress' },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
        },
      },
    ]);

    return (
      stats[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        averageProgress: 0,
        totalTimeSpent: 0,
      }
    );
  }

  async isEnrolled(courseId: string, userId: string): Promise<boolean> {
    const enrollment = await this.enrollmentModel.findOne({
      student: userId,
      course: courseId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    });

    return !!enrollment;
  }

  async unenroll(courseId: string, userId: string): Promise<void> {
    const enrollment = await this.enrollmentModel.findOne({
      student: userId,
      course: courseId,
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot unenroll from completed course');
    }

    enrollment.status = EnrollmentStatus.CANCELLED;
    await enrollment.save();
  }

  async getUserStats(userId: string): Promise<any> {
    const enrollments = await this.enrollmentModel.find({ student: userId });

    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(
        (e) => e.status === EnrollmentStatus.ACTIVE,
      ).length,
      completedEnrollments: enrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length,
      totalTimeSpent: enrollments.reduce((sum, e) => sum + e.totalTimeSpent, 0),
      averageProgress:
        enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + e.progress, 0) /
          enrollments.length
          : 0,
    };

    return stats;
  }

  // Admin methods
  async getAllEnrollments(params: {
    page: number;
    limit: number;
    search?: string;
    courseId?: string;
    status?: EnrollmentStatus;
    instructorId?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<{ enrollments: Enrollment[]; total: number }> {
    const {
      page,
      limit,
      search,
      courseId,
      status,
      instructorId,
      sortBy,
      sortOrder,
    } = params;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    let query = this.enrollmentModel.find(filter);

    // Populate student and course
    query = query
      .populate('student', 'firstName lastName email avatar name')
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor',
        populate: {
          path: 'instructor',
          select: 'firstName lastName name',
        },
      });

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const [enrollments, total] = await Promise.all([
        query
          .exec()
          .then((results) =>
            results.filter(
              (e: any) =>
                e.student?.email?.match(searchRegex) ||
                e.student?.firstName?.match(searchRegex) ||
                e.student?.lastName?.match(searchRegex) ||
                e.student?.name?.match(searchRegex) ||
                e.course?.title?.match(searchRegex),
            ),
          ),
        query.countDocuments(),
      ]);
      return {
        enrollments: enrollments.slice(skip, skip + limit),
        total: enrollments.length,
      };
    }

    // Apply sorting
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    query = query.sort(sortOptions);

    const [enrollments, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.enrollmentModel.countDocuments(filter),
    ]);

    return { enrollments, total };
  }

  async getAdminStats(): Promise<any> {
    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      pendingEnrollments,
      droppedEnrollments,
      progressData,
    ] = await Promise.all([
      this.enrollmentModel.countDocuments(),
      this.enrollmentModel.countDocuments({ status: EnrollmentStatus.ACTIVE }),
      this.enrollmentModel.countDocuments({
        status: EnrollmentStatus.COMPLETED,
      }),
      this.enrollmentModel.countDocuments({ status: 'pending' }),
      this.enrollmentModel.countDocuments({ status: 'dropped' }),
      this.enrollmentModel.aggregate([
        {
          $group: {
            _id: null,
            averageProgress: { $avg: '$progress' },
            totalTimeSpent: { $sum: '$totalTimeSpent' },
          },
        },
      ]),
    ]);

    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      pendingEnrollments,
      droppedEnrollments,
      averageProgress: progressData[0]?.averageProgress || 0,
      totalTimeSpent: progressData[0]?.totalTimeSpent || 0,
      completionRate,
    };
  }

  async getCourseDistribution(): Promise<any[]> {
    const distribution = await this.enrollmentModel.aggregate([
      {
        $group: {
          _id: '$course',
          enrollmentCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseData',
        },
      },
      {
        $unwind: '$courseData',
      },
      {
        $project: {
          courseId: '$_id',
          courseName: '$courseData.title',
          enrollmentCount: 1,
        },
      },
      {
        $sort: { enrollmentCount: -1 },
      },
    ]);

    const total = distribution.reduce(
      (sum, item) => sum + item.enrollmentCount,
      0,
    );

    return distribution.map((item) => ({
      ...item,
      percentage:
        total > 0 ? Math.round((item.enrollmentCount / total) * 100) : 0,
    }));
  }

  async getAdminTrends(range: '7d' | '30d' | '90d' | 'year' = '30d'): Promise<
    {
      date: string;
      enrollments: number;
      completions: number;
      cancellations: number;
    }[]
  > {
    const now = new Date();
    let startDate = new Date();

    if (range === '7d') {
      startDate.setDate(now.getDate() - 6);
    } else if (range === '30d') {
      startDate.setDate(now.getDate() - 29);
    } else if (range === '90d') {
      startDate.setDate(now.getDate() - 89);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const raw = await this.enrollmentModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: now,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          enrollments: { $sum: 1 },
          completions: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.COMPLETED] }, 1, 0],
            },
          },
          cancellations: {
            $sum: {
              $cond: [{ $eq: ['$status', EnrollmentStatus.CANCELLED] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dataMap = new Map<
      string,
      { enrollments: number; completions: number; cancellations: number }
    >();

    raw.forEach((item: any) => {
      dataMap.set(item._id, {
        enrollments: item.enrollments || 0,
        completions: item.completions || 0,
        cancellations: item.cancellations || 0,
      });
    });

    const result: {
      date: string;
      enrollments: number;
      completions: number;
      cancellations: number;
    }[] = [];

    const cursor = new Date(startDate);
    while (cursor <= now) {
      const dateKey = cursor.toISOString().split('T')[0];
      const existing = dataMap.get(dateKey) || {
        enrollments: 0,
        completions: 0,
        cancellations: 0,
      };

      result.push({
        date: dateKey,
        enrollments: existing.enrollments,
        completions: existing.completions,
        cancellations: existing.cancellations,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  async getEnrollmentById(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel
      .findById(id)
      .populate('student', 'firstName lastName email avatar name phone')
      .populate({
        path: 'course',
        select: 'title description thumbnail instructor',
        populate: {
          path: 'instructor',
          select: 'firstName lastName name email',
        },
      })
      .populate('certificate')
      .exec();

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  async createEnrollmentAdmin(
    createEnrollmentDto: CreateEnrollmentAdminDto,
  ): Promise<Enrollment> {
    const { studentId, courseId, orderId, status } = createEnrollmentDto;

    // Check if already enrolled
    const existing = await this.enrollmentModel.findOne({
      student: studentId,
      course: courseId,
    });

    if (existing) {
      throw new BadRequestException('Student already enrolled in this course');
    }

    const enrollment = new this.enrollmentModel({
      student: studentId,
      course: courseId,
      order: orderId,
      status: status || EnrollmentStatus.ACTIVE,
      lastAccessedAt: new Date(),
    });

    return await enrollment.save();
  }

  async updateEnrollmentAdmin(
    id: string,
    updateData: any,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(id);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    Object.assign(enrollment, updateData);

    return await enrollment.save();
  }

  async deleteEnrollmentAdmin(id: string): Promise<void> {
    const result = await this.enrollmentModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Enrollment not found');
    }
  }

  async bulkDeleteEnrollments(ids: string[]): Promise<any> {
    const result = await this.enrollmentModel.deleteMany({
      _id: { $in: ids },
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
    };
  }

  async approveEnrollment(id: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(id);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.status = EnrollmentStatus.ACTIVE;
    return await enrollment.save();
  }

  async cancelEnrollmentAdmin(
    id: string,
    reason?: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(id);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.status = EnrollmentStatus.CANCELLED;
    if (reason) {
      enrollment.notes.push(`Cancelled: ${reason}`);
    }

    return await enrollment.save();
  }

  async exportEnrollments(params: {
    format: 'csv' | 'xlsx' | 'pdf';
    courseId?: string;
    status?: EnrollmentStatus;
  }): Promise<any> {
    const filter: any = {};
    if (params.courseId) filter.course = params.courseId;
    if (params.status) filter.status = params.status;

    const enrollments = await this.enrollmentModel
      .find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title')
      .exec();

    // For now, return the data. In production, implement actual export logic
    return {
      format: params.format,
      data: enrollments,
      total: enrollments.length,
    };
  }

  // ==================== Purchase Tracking Methods ====================

  /**
   * Create enrollment after successful purchase
   */
  async createPurchaseEnrollment(
    userId: string,
    courseId: string,
    purchaseData: {
      orderId: string;
      amountPaid: number;
      paymentMethod: string;
      transactionId?: string;
      paymentStatus?: string;
    },
  ): Promise<Enrollment> {
    // Check if already enrolled
    const existing = await this.enrollmentModel.findOne({
      student: userId,
      course: courseId,
    });

    if (existing) {
      // Update existing enrollment with purchase data
      existing.order = new Types.ObjectId(purchaseData.orderId);
      existing.accessType = 'paid';
      existing.amountPaid = purchaseData.amountPaid;
      existing.paymentMethod = purchaseData.paymentMethod;
      existing.transactionId = purchaseData.transactionId;
      existing.paymentStatus = purchaseData.paymentStatus || 'completed';
      existing.purchaseDate = new Date();
      existing.hasAccess = true;
      existing.status = EnrollmentStatus.ACTIVE;
      existing.lastAccessedAt = new Date();

      return await existing.save();
    }

    // Create new enrollment
    const enrollment = new this.enrollmentModel({
      student: userId,
      course: courseId,
      order: purchaseData.orderId,
      accessType: 'paid',
      amountPaid: purchaseData.amountPaid,
      paymentMethod: purchaseData.paymentMethod,
      transactionId: purchaseData.transactionId,
      paymentStatus: purchaseData.paymentStatus || 'completed',
      purchaseDate: new Date(),
      hasAccess: true,
      status: EnrollmentStatus.ACTIVE,
      lastAccessedAt: new Date(),
    });

    await enrollment.save();

    // Increment course enrollment count
    await this.courseModel.findByIdAndUpdate(courseId, {
      $inc: { enrollmentCount: 1 },
    });

    return enrollment;
  }

  /**
   * Verify purchase and create enrollments for multiple courses
   */
  async verifyAndCreateEnrollments(
    userId: string,
    orderId: string,
    courses: Array<{
      courseId: string;
      price: number;
    }>,
    paymentData: {
      paymentMethod: string;
      transactionId?: string;
      totalAmount: number;
    },
  ): Promise<{ enrollments: Enrollment[]; failures: string[] }> {
    const enrollments: Enrollment[] = [];
    const failures: string[] = [];

    for (const courseData of courses) {
      try {
        const enrollment = await this.createPurchaseEnrollment(
          userId,
          courseData.courseId,
          {
            orderId,
            amountPaid: courseData.price,
            paymentMethod: paymentData.paymentMethod,
            transactionId: paymentData.transactionId,
            paymentStatus: 'completed',
          },
        );
        enrollments.push(enrollment);
      } catch (error) {
        console.error(
          `Failed to create enrollment for course ${courseData.courseId}:`,
          error,
        );
        failures.push(courseData.courseId);
      }
    }

    return { enrollments, failures };
  }

  /**
   * Get purchased courses for dashboard
   */
  async getPurchasedCourses(
    userId: string,
    filters?: {
      paymentStatus?: string;
      accessType?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    enrollments: Enrollment[];
    total: number;
    stats: {
      totalPurchased: number;
      totalSpent: number;
      activeAccess: number;
      completed: number;
    };
  }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = { student: userId };

    if (filters?.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters?.accessType) {
      query.accessType = filters.accessType;
    }

    // Get enrollments with populated course data
    const sortOptions: any = {};
    if (filters?.sortBy) {
      sortOptions[filters.sortBy] =
        filters.sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.purchaseDate = -1; // Default: newest first
    }

    const [enrollments, total, stats] = await Promise.all([
      this.enrollmentModel
        .find(query)
        .populate({
          path: 'course',
          select:
            'title slug thumbnail description price originalPrice rating reviewCount studentCount instructor categories duration totalLessons level type status',
          populate: {
            path: 'instructor',
            select: 'firstName lastName email avatar',
          },
        })
        .populate('certificate')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.enrollmentModel.countDocuments(query),
      this.enrollmentModel.aggregate([
        { $match: { student: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalPurchased: { $sum: 1 },
            totalSpent: { $sum: '$amountPaid' },
            activeAccess: {
              $sum: { $cond: [{ $eq: ['$hasAccess', true] }, 1, 0] },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', EnrollmentStatus.COMPLETED] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const statResults = stats[0] || {
      totalPurchased: 0,
      totalSpent: 0,
      activeAccess: 0,
      completed: 0,
    };

    return {
      enrollments,
      total,
      stats: statResults,
    };
  }

  /**
   * Update access control for enrollment
   */
  async updateAccess(
    enrollmentId: string,
    hasAccess: boolean,
    reason?: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.hasAccess = hasAccess;

    if (!hasAccess) {
      enrollment.accessRevokedAt = new Date();
      enrollment.accessRevokedReason = reason;
    } else {
      enrollment.accessRevokedAt = undefined;
      enrollment.accessRevokedReason = undefined;
    }

    return await enrollment.save();
  }

  /**
   * Process refund and revoke access
   */
  async processRefund(
    enrollmentId: string,
    refundReason: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentModel.findById(enrollmentId);

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    enrollment.paymentStatus = 'refunded';
    enrollment.refundedAt = new Date();
    enrollment.refundReason = refundReason;
    enrollment.hasAccess = false;
    enrollment.status = EnrollmentStatus.CANCELLED;
    enrollment.accessRevokedAt = new Date();
    enrollment.accessRevokedReason = `Refunded: ${refundReason}`;

    // Decrement course enrollment count
    await this.courseModel.findByIdAndUpdate(enrollment.course, {
      $inc: { enrollmentCount: -1 },
    });

    return await enrollment.save();
  }

  /**
   * Get purchase analytics for admin/instructor
   */
  async getPurchaseAnalytics(
    filters?: {
      startDate?: Date;
      endDate?: Date;
      courseId?: string;
      instructorId?: string;
    },
  ): Promise<{
    totalRevenue: number;
    totalPurchases: number;
    averageOrderValue: number;
    refundRate: number;
    topCourses: Array<{
      courseId: string;
      courseName: string;
      purchases: number;
      revenue: number;
    }>;
  }> {
    const matchQuery: any = { accessType: 'paid' };

    if (filters?.startDate || filters?.endDate) {
      matchQuery.purchaseDate = {};
      if (filters.startDate) matchQuery.purchaseDate.$gte = filters.startDate;
      if (filters.endDate) matchQuery.purchaseDate.$lte = filters.endDate;
    }

    if (filters?.courseId) {
      matchQuery.course = new Types.ObjectId(filters.courseId);
    }

    const [analytics, topCourses] = await Promise.all([
      this.enrollmentModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amountPaid' },
            totalPurchases: { $sum: 1 },
            refunds: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, 1, 0] },
            },
          },
        },
      ]),
      this.enrollmentModel.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$course',
            purchases: { $sum: 1 },
            revenue: { $sum: '$amountPaid' },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'courseData',
          },
        },
        { $unwind: '$courseData' },
        {
          $project: {
            courseId: '$_id',
            courseName: '$courseData.title',
            purchases: 1,
            revenue: 1,
          },
        },
      ]),
    ]);

    const analyticsData = analytics[0] || {
      totalRevenue: 0,
      totalPurchases: 0,
      refunds: 0,
    };

    return {
      totalRevenue: analyticsData.totalRevenue,
      totalPurchases: analyticsData.totalPurchases,
      averageOrderValue:
        analyticsData.totalPurchases > 0
          ? analyticsData.totalRevenue / analyticsData.totalPurchases
          : 0,
      refundRate:
        analyticsData.totalPurchases > 0
          ? (analyticsData.refunds / analyticsData.totalPurchases) * 100
          : 0,
      topCourses,
    };
  }
}

