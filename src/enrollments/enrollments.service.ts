import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrollment, EnrollmentStatus } from './entities/enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
  ) {}

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
}
