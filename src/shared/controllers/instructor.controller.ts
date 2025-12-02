import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Order } from '../../orders/entities/order.entity';

@ApiTags('Instructor Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class InstructorController {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get instructor dashboard overview' })
  async getDashboard(@CurrentUser() user: any) {
    const instructorId = user.userId;

    // Get all instructor courses
    const courses = await this.courseModel.find({ instructor: instructorId });
    const courseIds = courses.map((c) => c._id);

    // Get enrollment stats
    const enrollments = await this.enrollmentModel.find({
      course: { $in: courseIds },
    });

    // Get revenue (if available)
    const revenue = await this.orderModel.aggregate([
      { $match: { courses: { $in: courseIds }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    // Calculate statistics
    const stats = {
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => c.status === 'published').length,
      draftCourses: courses.filter((c) => c.status === 'draft').length,
      totalStudents: enrollments.length,
      activeStudents: enrollments.filter((e) => e.status === 'active').length,
      completedEnrollments: enrollments.filter((e) => e.progress >= 100).length,
      avgCourseRating:
        courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length ||
        0,
      totalRevenue: revenue[0]?.total || 0,
      avgStudentProgress:
        enrollments.reduce((sum, e) => sum + e.progress, 0) /
          enrollments.length || 0,
    };

    // Get top performing courses
    const topCourses = await Promise.all(
      courses
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map(async (course) => {
          const enrollmentCount = await this.enrollmentModel.countDocuments({
            course: course._id,
          });
          return {
            id: course._id,
            title: course.title,
            rating: course.rating,
            students: enrollmentCount,
            published: course.status === 'published',
          };
        }),
    );

    // Recent enrollments
    const recentEnrollments = await this.enrollmentModel
      .find({ course: { $in: courseIds } })
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      stats,
      topCourses,
      recentEnrollments: recentEnrollments.map((e) => {
        const student: any = e.student;
        return {
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            avatar: student.avatar,
          },
          course: e.course,
          enrolledDate: (e as any).createdAt,
          progress: e.progress,
        };
      }),
    };
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all instructor courses with stats' })
  async getMyCourses(@CurrentUser() user: any) {
    const instructorId = user.userId;

    const courses = await this.courseModel
      .find({ instructor: instructorId })
      .sort({ createdAt: -1 });

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await this.enrollmentModel.countDocuments({
          course: course._id,
        });
        const avgProgress = await this.enrollmentModel.aggregate([
          { $match: { course: course._id } },
          { $group: { _id: null, avg: { $avg: '$progress' } } },
        ]);

        return {
          ...course.toObject(),
          stats: {
            enrollments: enrollmentCount,
            avgProgress: avgProgress[0]?.avg || 0,
          },
        };
      }),
    );

    return {
      courses: coursesWithStats,
      total: courses.length,
    };
  }

  @Get('students')
  @ApiOperation({ summary: 'Get all students enrolled in instructor courses' })
  async getMyStudents(@CurrentUser() user: any) {
    const instructorId = user.userId;

    const courses = await this.courseModel.find({ instructor: instructorId });
    const courseIds = courses.map((c) => c._id);

    const enrollments = await this.enrollmentModel
      .find({ course: { $in: courseIds } })
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    return {
      students: enrollments.map((e) => {
        const student: any = e.student;
        return {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
          avatar: student.avatar,
          course: e.course,
          progress: e.progress,
          status: e.status,
          enrolledDate: (e as any).createdAt,
          lastAccessed: e.lastAccessedAt,
        };
      }),
      totalStudents: enrollments.length,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get instructor revenue statistics' })
  async getRevenue(@CurrentUser() user: any) {
    const instructorId = user.userId;

    const courses = await this.courseModel.find({ instructor: instructorId });
    const courseIds = courses.map((c) => c._id);

    const revenueData = await this.orderModel.aggregate([
      {
        $match: {
          courses: { $in: courseIds },
          status: { $in: ['completed', 'confirmed'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    const totalRevenue = revenueData.reduce(
      (sum, item) => sum + item.totalRevenue,
      0,
    );
    const totalOrders = revenueData.reduce(
      (sum, item) => sum + item.orderCount,
      0,
    );

    return {
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      monthlyRevenue: revenueData.reverse(),
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get detailed instructor analytics' })
  async getAnalytics(@CurrentUser() user: any) {
    const instructorId = user.userId;

    const courses = await this.courseModel.find({ instructor: instructorId });
    const courseIds = courses.map((c) => c._id);

    // Enrollment trends
    const enrollmentTrends = await this.enrollmentModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    // Student retention
    const retention = await this.enrollmentModel.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Course completion rates
    const completionRates = await Promise.all(
      courses.map(async (course) => {
        const total = await this.enrollmentModel.countDocuments({
          course: course._id,
        });
        const completed = await this.enrollmentModel.countDocuments({
          course: course._id,
          progress: { $gte: 100 },
        });

        return {
          course: { id: course._id, title: course.title },
          completionRate: total > 0 ? (completed / total) * 100 : 0,
          totalStudents: total,
          completedStudents: completed,
        };
      }),
    );

    return {
      enrollmentTrends: enrollmentTrends.reverse(),
      retention,
      completionRates,
    };
  }
}
