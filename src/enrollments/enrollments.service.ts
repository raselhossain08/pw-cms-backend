import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { CreateEnrollmentDto, CreateEnrollmentAdminDto } from './dto/create-enrollment.dto';
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

    const enrollment = new this.enrollmentModel({
      student: userId,
      course: createEnrollmentDto.courseId,
      order: createEnrollmentDto.orderId,
      lastAccessedAt: new Date(),
    });

    return await enrollment.save();
  }

  async getEnrollment(
    courseId: string,
    userId: string,
  ): Promise<Enrollment | null> {
    return await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .populate('course')
      .populate('certificate')
      .exec();
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
        .populate('course')
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
    const enrollment = await this.enrollmentModel.findOne({
      student: userId,
      course: courseId,
    });

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

    // Calculate overall progress
    const completedCount = Array.from(
      enrollment.completedLessons.values(),
    ).filter(Boolean).length;
    const totalLessons = enrollment.completedLessons.size;

    if (totalLessons > 0) {
      enrollment.progress = Math.round((completedCount / totalLessons) * 100);
    }

    // Check if course is completed
    if (enrollment.progress === 100 && !enrollment.completedAt) {
      enrollment.status = EnrollmentStatus.COMPLETED;
      enrollment.completedAt = new Date();
    }

    return await enrollment.save();
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

  async getAdminTrends(
    range: '7d' | '30d' | '90d' | 'year' = '30d',
  ): Promise<
    { date: string; enrollments: number; completions: number; cancellations: number }[]
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

  async createEnrollmentAdmin(createEnrollmentDto: CreateEnrollmentAdminDto): Promise<Enrollment> {
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
}
