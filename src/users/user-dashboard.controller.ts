import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Enrollment,
  EnrollmentStatus,
} from '../enrollments/entities/enrollment.entity';
import { Certificate } from '../certificates/entities/additional.entity';

@ApiTags('User Dashboard')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserDashboardController {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Certificate.name) private certificateModel: Model<Certificate>,
  ) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get user dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  async getDashboardStats(@Req() req) {
    const userId = req.user.id;

    // Get enrollments
    const enrollments = await this.enrollmentModel
      .find({ student: userId })
      .populate('course', 'title')
      .lean();

    // Get certificates
    const certificates = await this.certificateModel
      .find({ user: userId })
      .lean();

    // Calculate stats
    const completedCourses = enrollments.filter(
      (e) => e.progress === 100 || e.status === EnrollmentStatus.COMPLETED,
    ).length;

    const inProgressCourses = enrollments.filter(
      (e) =>
        e.progress > 0 &&
        e.progress < 100 &&
        e.status === EnrollmentStatus.ACTIVE,
    ).length;

    const totalHoursLearned = Math.round(
      enrollments.reduce((sum, e) => sum + (e.totalTimeSpent || 0), 0) / 60,
    );

    // Calculate current streak (days of consecutive learning)
    const currentStreak = await this.calculateLearningStreak(userId);

    // Get recent activity
    const recentActivity = enrollments
      .filter((e) => e.lastAccessedAt)
      .sort((a, b) => {
        const dateA = a.lastAccessedAt
          ? new Date(a.lastAccessedAt).getTime()
          : 0;
        const dateB = b.lastAccessedAt
          ? new Date(b.lastAccessedAt).getTime()
          : 0;
        return dateB - dateA;
      })
      .slice(0, 5)
      .map((e) => ({
        type: 'course_access',
        title: (e.course as any)?.title || 'Course',
        date: e.lastAccessedAt,
        metadata: {
          progress: e.progress,
          courseId: e.course,
        },
      }));

    return {
      enrolledCourses: enrollments.length,
      completedCourses,
      inProgressCourses,
      certificates: certificates.length,
      totalHoursLearned,
      currentStreak,
      assignments: {
        total: 0, // TODO: Implement when assignments module is ready
        completed: 0,
        pending: 0,
        overdue: 0,
      },
      quizzes: {
        total: 0, // TODO: Implement when quizzes module is ready
        passed: 0,
        failed: 0,
        averageScore: 0,
      },
      recentActivity,
    };
  }

  private async calculateLearningStreak(userId: string): Promise<number> {
    const enrollments = await this.enrollmentModel
      .find({ student: userId, lastAccessedAt: { $exists: true } })
      .sort({ lastAccessedAt: -1 })
      .lean();

    if (enrollments.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastAccessedDate = enrollments[0].lastAccessedAt;
    if (!lastAccessedDate) return 0;

    const lastAccessed = new Date(lastAccessedDate);
    lastAccessed.setHours(0, 0, 0, 0);

    const diffDays = Math.floor(
      (today.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays > 1) return 0;
    if (diffDays === 1) streak = 1;

    // Calculate consecutive days
    const accessDates = enrollments
      .map((e) => {
        if (!e.lastAccessedAt) return null;
        const date = new Date(e.lastAccessedAt);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((time): time is number => time !== null)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => b - a);

    for (let i = 0; i < accessDates.length - 1; i++) {
      const diff = Math.floor(
        (accessDates[i] - accessDates[i + 1]) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
