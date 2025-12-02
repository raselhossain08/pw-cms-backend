import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@ApiTags('Reports & Export')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
  ) {}

  @Get('sales')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Sales report with filters' })
  async getSalesReport(
    @Query() query: { startDate?: string; endDate?: string; groupBy?: string },
  ) {
    const match: any = {};

    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const groupBy = query.groupBy || 'day';
    const dateFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      year: { $dateToString: { format: '%Y', date: '$createdAt' } },
    };

    const salesData = await this.orderModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateFormat[groupBy],
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = await this.orderModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);

    return {
      salesData,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders: salesData.reduce((sum, item) => sum + item.orderCount, 0),
        period: { start: query.startDate, end: query.endDate },
      },
    };
  }

  @Get('enrollments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Enrollment report' })
  async getEnrollmentReport(
    @Query() query: { startDate?: string; endDate?: string; courseId?: string },
  ) {
    const match: any = {};

    if (query.courseId) match.course = query.courseId;
    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const enrollmentStats = await this.enrollmentModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgProgress: { $avg: '$progress' },
        },
      },
    ]);

    const topCourses = await this.enrollmentModel.aggregate([
      { $match: match },
      { $group: { _id: '$course', enrollments: { $sum: 1 } } },
      { $sort: { enrollments: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'courseDetails',
        },
      },
    ]);

    return {
      enrollmentStats,
      topCourses,
      totalEnrollments: enrollmentStats.reduce(
        (sum, item) => sum + item.count,
        0,
      ),
    };
  }

  @Get('users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'User statistics report' })
  async getUserReport(@Query() query: { role?: string; status?: string }) {
    const match: any = {};
    if (query.role) match.role = query.role;
    if (query.status) match.status = query.status;

    const userStats = await this.userModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
    ]);

    const recentSignups = await this.userModel
      .find(match)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email role createdAt');

    return {
      userStats,
      recentSignups,
      totalUsers: userStats.reduce((sum, item) => sum + item.count, 0),
    };
  }

  @Get('export/users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export users to CSV' })
  async exportUsers(@Res() res: Response, @Query() query: { role?: string }) {
    const match: any = {};
    if (query.role) match.role = query.role;

    const users = await this.userModel
      .find(match)
      .select('firstName lastName email role status phone createdAt')
      .lean();

    // Generate CSV
    const csvHeader =
      'First Name,Last Name,Email,Role,Status,Phone,Joined Date\n';
    const csvRows = users
      .map(
        (u) =>
          `${u.firstName},${u.lastName},${u.email},${u.role},${u.status},${u.phone || 'N/A'},${new Date(u['createdAt']).toLocaleDateString()}`,
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=users-export.csv',
    );
    res.send(csvHeader + csvRows);
  }

  @Get('export/orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export orders to CSV' })
  async exportOrders(
    @Res() res: Response,
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    const match: any = {};
    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const orders = await this.orderModel
      .find(match)
      .populate('user', 'firstName lastName email')
      .populate('courses', 'title')
      .lean();

    const csvHeader =
      'Order Number,Customer,Email,Courses,Total,Status,Payment Method,Date\n';
    const csvRows = orders
      .map((o) => {
        const user: any = o.user;
        const courses: any = o.courses;
        return `${o.orderNumber},${user?.firstName} ${user?.lastName},${user?.email},"${courses?.map((c: any) => c.title).join('; ')}",${o.total},${o.status},${o.paymentMethod},${new Date(o['createdAt']).toLocaleDateString()}`;
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=orders-export.csv',
    );
    res.send(csvHeader + csvRows);
  }

  @Get('instructor-performance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Instructor performance report' })
  async getInstructorPerformance(@Query() query: { instructorId?: string }) {
    const match: any = { role: 'INSTRUCTOR' };
    if (query.instructorId) match._id = query.instructorId;

    const instructors = await this.userModel
      .find(match)
      .select('firstName lastName email');

    const performanceData = await Promise.all(
      instructors.map(async (instructor) => {
        const courses = await this.courseModel.countDocuments({
          instructor: instructor._id,
        });
        const enrollments = await this.enrollmentModel.aggregate([
          {
            $lookup: {
              from: 'courses',
              localField: 'course',
              foreignField: '_id',
              as: 'courseDetails',
            },
          },
          { $unwind: '$courseDetails' },
          { $match: { 'courseDetails.instructor': instructor._id } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              avgProgress: { $avg: '$progress' },
            },
          },
        ]);

        return {
          instructor: {
            id: instructor._id,
            name: `${instructor.firstName} ${instructor.lastName}`,
            email: instructor.email,
          },
          totalCourses: courses,
          totalEnrollments: enrollments[0]?.total || 0,
          avgStudentProgress: enrollments[0]?.avgProgress || 0,
        };
      }),
    );

    return {
      instructors: performanceData,
      totalInstructors: instructors.length,
    };
  }
}
