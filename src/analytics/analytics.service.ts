import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsEvent } from './entities/analytics.entity';
import { AnalyticsQueryDto, AnalyticsPeriod } from './dto/analytics-query.dto';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsModel: Model<AnalyticsEvent>,
    private coursesService: CoursesService,
    private usersService: UsersService,
    private ordersService: OrdersService,
  ) {}

  async trackEvent(
    eventData: Partial<AnalyticsEvent>,
  ): Promise<AnalyticsEvent> {
    const event = new this.analyticsModel(eventData);
    return await event.save();
  }

  async getDashboardAnalytics() {
    const [
      revenueData,
      enrollmentData,
      userStats,
      courseStats,
      topCourses,
      recentActivities,
    ] = await Promise.all([
      this.getRevenueAnalytics(AnalyticsPeriod.MONTH),
      this.getEnrollmentAnalytics(AnalyticsPeriod.MONTH),
      this.usersService.getStats(),
      this.coursesService.getStats(),
      this.getTopPerformingCourses(),
      this.getRecentActivities(),
    ]);

    return {
      overview: {
        totalRevenue: revenueData.totalRevenue,
        totalEnrollments: enrollmentData.totalEnrollments,
        activeUsers: userStats.activeUsers,
        conversionRate: await this.getConversionRate(),
      },
      charts: {
        revenue: revenueData.chartData,
        enrollments: enrollmentData.chartData,
        traffic: await this.getTrafficAnalytics(AnalyticsPeriod.MONTH),
      },
      topCourses,
      recentActivities,
      userStats,
      courseStats,
    };
  }

  async getRevenueAnalytics(period: AnalyticsPeriod = AnalyticsPeriod.MONTH) {
    const dateRange = this.getDateRange(period);

    const revenueData =
      await this.ordersService.getRevenueByDateRange(dateRange);
    const chartData = this.formatChartData(revenueData, period);

    const totalRevenue = revenueData.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    return {
      totalRevenue,
      chartData,
      period,
      growth: await this.getRevenueGrowth(period),
    };
  }

  async getEnrollmentAnalytics(
    period: AnalyticsPeriod = AnalyticsPeriod.MONTH,
  ) {
    const dateRange = this.getDateRange(period);

    const enrollmentData =
      await this.coursesService.getEnrollmentsByDateRange(dateRange);
    const chartData = this.formatChartData(enrollmentData, period);

    const totalEnrollments = enrollmentData.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    return {
      totalEnrollments,
      chartData,
      period,
      growth: await this.getEnrollmentGrowth(period),
    };
  }

  async getCoursePerformance() {
    const courseStats = await this.coursesService.getStats();
    const topCourses = await this.getTopPerformingCourses();
    const courseCompletionRates = await this.getCourseCompletionRates();

    return {
      overall: courseStats,
      topPerformers: topCourses,
      completionRates: courseCompletionRates,
      studentEngagement: await this.getStudentEngagementMetrics(),
    };
  }

  async getStudentProgress() {
    const progressData = await this.analyticsModel.aggregate([
      {
        $match: {
          eventType: 'lesson_completed',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$user',
          completedLessons: { $sum: 1 },
          lastActivity: { $max: '$createdAt' },
          totalTimeSpent: { $sum: '$properties.duration' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          completedLessons: 1,
          lastActivity: 1,
          totalTimeSpent: 1,
          daysActive: {
            $floor: {
              $divide: [
                { $subtract: ['$lastActivity', '$user.createdAt'] },
                24 * 60 * 60 * 1000,
              ],
            },
          },
        },
      },
      { $sort: { completedLessons: -1 } },
      { $limit: 50 },
    ]);

    return {
      totalStudents: progressData.length,
      averageCompletionRate: await this.getAverageCompletionRate(),
      progressData,
      engagementMetrics: await this.getEngagementMetrics(),
    };
  }

  async getInstructorPerformance() {
    const instructors = await this.usersService.getInstructors();

    const performanceData = await Promise.all(
      instructors.map(async (instructor) => {
        const courses = await this.coursesService.getInstructorCourses(
          instructor.id,
        );
        const revenue = courses.courses.reduce(
          (sum, course) => sum + course.totalRevenue,
          0,
        );
        const enrollments = courses.courses.reduce(
          (sum, course) => sum + course.studentCount,
          0,
        );
        const averageRating =
          courses.courses.reduce((sum, course) => sum + course.rating, 0) /
          courses.courses.length;

        return {
          instructor: {
            id: instructor.id,
            name: instructor.fullName,
            email: instructor.email,
          },
          metrics: {
            totalCourses: courses.total,
            totalRevenue: revenue,
            totalEnrollments: enrollments,
            averageRating: averageRating || 0,
            completionRate: await this.getInstructorCompletionRate(
              instructor.id,
            ),
          },
          courses: courses.courses.map((course) => ({
            title: course.title,
            enrollments: course.studentCount,
            revenue: course.totalRevenue,
            rating: course.rating,
          })),
        };
      }),
    );

    return performanceData.sort(
      (a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue,
    );
  }

  async getGeographicDistribution() {
    const distribution = await this.usersService.getGeographicDistribution();
    const enrollmentByCountry =
      await this.ordersService.getEnrollmentsByCountry();

    return {
      userDistribution: distribution,
      enrollmentDistribution: enrollmentByCountry,
      topCountries: this.getTopCountries(distribution),
    };
  }

  async getConversionRates() {
    const [visitData, enrollmentData, purchaseData] = await Promise.all([
      this.getPageViews(),
      this.getEnrollmentEvents(),
      this.getPurchaseEvents(),
    ]);

    const visitToEnrollment = (enrollmentData.length / visitData.length) * 100;
    const enrollmentToPurchase =
      (purchaseData.length / enrollmentData.length) * 100;
    const overallConversion = (purchaseData.length / visitData.length) * 100;

    return {
      visitToEnrollment: isNaN(visitToEnrollment) ? 0 : visitToEnrollment,
      enrollmentToPurchase: isNaN(enrollmentToPurchase)
        ? 0
        : enrollmentToPurchase,
      overallConversion: isNaN(overallConversion) ? 0 : overallConversion,
      funnelData: {
        visits: visitData.length,
        enrollments: enrollmentData.length,
        purchases: purchaseData.length,
      },
      trends: await this.getConversionTrends(),
    };
  }

  // Helper methods
  private getDateRange(period: AnalyticsPeriod): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case AnalyticsPeriod.DAY:
        start.setDate(end.getDate() - 1);
        break;
      case AnalyticsPeriod.WEEK:
        start.setDate(end.getDate() - 7);
        break;
      case AnalyticsPeriod.MONTH:
        start.setMonth(end.getMonth() - 1);
        break;
      case AnalyticsPeriod.YEAR:
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setMonth(end.getMonth() - 1);
    }

    return { start, end };
  }

  private formatChartData(data: any[], period: AnalyticsPeriod): any[] {
    // Format data for charts based on period
    const chartData = Array.from(
      { length: this.getPeriodLength(period) },
      (_, i) => ({
        label: this.getPeriodLabel(period, i),
        value: 0,
      }),
    );

    data.forEach((item) => {
      const index = this.getDataIndex(item, period);
      if (index >= 0 && index < chartData.length) {
        chartData[index].value += item.amount || item.count || 0;
      }
    });

    return chartData;
  }

  private getPeriodLength(period: AnalyticsPeriod): number {
    switch (period) {
      case AnalyticsPeriod.DAY:
        return 24;
      case AnalyticsPeriod.WEEK:
        return 7;
      case AnalyticsPeriod.MONTH:
        return 30;
      case AnalyticsPeriod.YEAR:
        return 12;
      default:
        return 30;
    }
  }

  private getPeriodLabel(period: AnalyticsPeriod, index: number): string {
    // Implementation for generating period labels
    return `Label ${index}`;
  }

  private getDataIndex(item: any, period: AnalyticsPeriod): number {
    // Implementation for determining data index based on period
    return 0;
  }

  private async getTopPerformingCourses() {
    const courses = await this.coursesService.getFeaturedCourses(10);
    return courses.map((course) => ({
      id: course.id,
      title: course.title,
      instructor: course.instructor,
      revenue: course.totalRevenue,
      enrollments: course.studentCount,
      rating: course.rating,
      completionRate: course.completionRate,
    }));
  }

  private async getRecentActivities() {
    return await this.analyticsModel
      .find()
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();
  }

  private async getConversionRate(): Promise<number> {
    const [visits, purchases] = await Promise.all([
      this.analyticsModel.countDocuments({ eventType: 'page_view' }),
      this.ordersService.countCompletedOrders(),
    ]);

    return visits > 0 ? (purchases / visits) * 100 : 0;
  }

  private async getRevenueGrowth(period: AnalyticsPeriod): Promise<number> {
    const currentRange = this.getDateRange(period);
    const previousRange = this.getDateRange(period);
    previousRange.start.setMonth(previousRange.start.getMonth() - 1);
    previousRange.end.setMonth(previousRange.end.getMonth() - 1);

    const [currentRevenue, previousRevenue] = await Promise.all([
      this.ordersService.getRevenueByDateRange(currentRange),
      this.ordersService.getRevenueByDateRange(previousRange),
    ]);

    const currentTotal = currentRevenue.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const previousTotal = previousRevenue.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    return previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;
  }

  private async getEnrollmentGrowth(period: AnalyticsPeriod): Promise<number> {
    // Similar implementation to revenue growth but for enrollments
    return 0;
  }

  private async getCourseCompletionRates() {
    // Implementation for course completion rates
    return [];
  }

  private async getStudentEngagementMetrics() {
    // Implementation for student engagement metrics
    return {};
  }

  private async getAverageCompletionRate(): Promise<number> {
    // Implementation for average completion rate
    return 0;
  }

  private async getEngagementMetrics() {
    // Implementation for engagement metrics
    return {};
  }

  private async getInstructorCompletionRate(
    instructorId: string,
  ): Promise<number> {
    // Implementation for instructor completion rate
    return 0;
  }

  private getTopCountries(distribution: any[]): any[] {
    // Implementation for top countries
    return distribution.slice(0, 10);
  }

  private async getPageViews(): Promise<any[]> {
    return await this.analyticsModel.find({ eventType: 'page_view' }).exec();
  }

  private async getEnrollmentEvents(): Promise<any[]> {
    return await this.analyticsModel
      .find({ eventType: 'course_enrollment' })
      .exec();
  }

  private async getPurchaseEvents(): Promise<any[]> {
    return await this.ordersService.findCompletedOrders();
  }

  private async getConversionTrends() {
    // Implementation for conversion trends
    return {};
  }

  private async getTrafficAnalytics(period: AnalyticsPeriod) {
    const dateRange = this.getDateRange(period);

    const trafficData = await this.analyticsModel.aggregate([
      {
        $match: {
          eventType: 'page_view',
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          visits: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          date: '$_id',
          visits: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
      { $sort: { date: 1 } },
    ]);

    return this.formatChartData(trafficData, period);
  }
}
