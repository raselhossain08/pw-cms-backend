import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsEvent } from './entities/analytics.entity';
import { Report } from './entities/report.entity';
import { AnalyticsQueryDto, AnalyticsPeriod } from './dto/analytics-query.dto';
import { CreateReportDto, ReportStatus } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import { OrdersService } from '../orders/orders.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsModel: Model<AnalyticsEvent>,
    @InjectModel(Report.name)
    private reportModel: Model<Report>,
    private coursesService: CoursesService,
    private usersService: UsersService,
    private ordersService: OrdersService,
  ) { }

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

    // Calculate total orders count from revenue data (each item represents daily orders)
    const totalOrders = revenueData.reduce(
      (sum, item) => sum + (item.count || 0),
      0,
    );

    return {
      totalRevenue,
      totalOrders,
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

    // Calculate total for percentages
    const totalUsers = distribution.reduce((sum, item) => sum + item.count, 0);
    const totalRevenue = enrollmentByCountry.reduce(
      (sum, item) => sum + (item.revenue || 0),
      0,
    );

    // Merge user distribution with enrollment data and format for frontend
    const countryMap = new Map();

    // Add user distribution data
    distribution.forEach((item) => {
      countryMap.set(item.country, {
        country: item.country,
        count: item.count,
        percentage: totalUsers > 0 ? (item.count / totalUsers) * 100 : 0,
        revenue: 0,
      });
    });

    // Add enrollment/revenue data
    enrollmentByCountry.forEach((item) => {
      const country = item._id || 'Unknown';
      const existing = countryMap.get(country) || {
        country,
        count: 0,
        percentage: 0,
        revenue: 0,
      };
      countryMap.set(country, {
        ...existing,
        revenue: item.revenue || 0,
      });
    });

    // Convert to array and sort by percentage
    const countries = Array.from(countryMap.values())
      .map((item) => ({
        country: item.country,
        label: item.country,
        name: item.country,
        count: item.count,
        percentage: Math.round(item.percentage * 100) / 100,
        pct: Math.round(item.percentage * 100) / 100,
        visitsPct: Math.round(item.percentage * 100) / 100,
        revenue: item.revenue,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    return {
      userDistribution: distribution,
      enrollmentDistribution: enrollmentByCountry,
      topCountries: this.getTopCountries(distribution),
      countries, // Frontend expects this format
    };
  }

  async getConversionRates() {
    const [
      visitData,
      enrollmentData,
      purchaseData,
      addToCartData,
      checkoutData,
    ] = await Promise.all([
      this.getPageViews(),
      this.getEnrollmentEvents(),
      this.getPurchaseEvents(),
      this.getAddToCartEvents(),
      this.getCheckoutEvents(),
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
      // Frontend expects these properties for funnel display
      visits: visitData.length,
      addsToCart: addToCartData.length,
      checkouts: checkoutData.length,
      purchases: purchaseData.length,
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

  async getCourseLessonsAnalytics(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<{
    totalViews: number;
    totalCompletions: number;
    averageCompletion: number;
    lessonsCount: number;
  }> {
    const lessons: any[] = await this.coursesService.getCourseLessons(
      courseId,
      userId,
      userRole,
    );
    const lessonsCount = lessons.length;
    const totalCompletions = lessons.reduce(
      (sum, l) => sum + (l?.completionCount || 0),
      0,
    );
    const totalViews = totalCompletions;
    const averageCompletion =
      lessonsCount > 0
        ? Math.round(
          lessons.reduce((sum, l) => sum + (l?.averageScore || 0), 0) /
          lessonsCount,
        )
        : 0;
    return { totalViews, totalCompletions, averageCompletion, lessonsCount };
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

  private async getAddToCartEvents(): Promise<any[]> {
    return await this.analyticsModel.find({ eventType: 'add_to_cart' }).exec();
  }

  private async getCheckoutEvents(): Promise<any[]> {
    return await this.analyticsModel
      .find({ eventType: 'checkout_started' })
      .exec();
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

  // ===== REPORTS CRUD METHODS =====

  async createReport(
    createReportDto: CreateReportDto,
    userId: string,
  ): Promise<Report> {
    const report = new this.reportModel({
      ...createReportDto,
      createdBy: new Types.ObjectId(userId),
      status: createReportDto.status || ReportStatus.DRAFT,
    });

    const savedReport = await report.save();

    if (createReportDto.autoGenerate) {
      // Asynchronously generate the report
      this.generateReport(String(savedReport._id)).catch((err) =>
        console.error('Report generation failed:', err),
      );
    }

    return savedReport;
  }

  async getAllReports(filters: {
    type?: string;
    status?: string;
    limit?: number;
    page?: number;
    userId?: string;
    userRole?: UserRole;
  }): Promise<{
    reports: Report[];
    total: number;
    page: number;
    pages: number;
  }> {
    const { type, status, limit = 20, page = 1, userId, userRole } = filters;

    const query: any = {};

    if (type) query.type = type;
    if (status) query.status = status;

    // Non-admins can only see their own reports
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      query.createdBy = new Types.ObjectId(userId);
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.reportModel.countDocuments(query),
    ]);

    return {
      reports,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getReportById(id: string): Promise<Report> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.reportModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .exec();

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async updateReport(
    id: string,
    updateReportDto: UpdateReportDto,
    userId: string,
  ): Promise<Report> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.reportModel
      .findByIdAndUpdate(
        id,
        {
          ...updateReportDto,
          updatedBy: new Types.ObjectId(userId),
        },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .exec();

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  async deleteReport(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid report ID');
    }

    const result = await this.reportModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }
  }

  async generateReport(id: string): Promise<Report> {
    const report = await this.getReportById(id);

    try {
      // Generate report data based on type
      let data: any = {};

      switch (report.type) {
        case 'Sales':
          data = await this.getRevenueAnalytics(AnalyticsPeriod.MONTH);
          break;
        case 'Engagement':
          data = await this.getStudentProgress();
          break;
        case 'Traffic':
          data = await this.getTrafficAnalytics(AnalyticsPeriod.MONTH);
          break;
        case 'Overview':
        default:
          data = await this.getDashboardAnalytics();
          break;
      }

      report.data = data;
      report.status = ReportStatus.GENERATED;
      report.generatedAt = new Date();

      return await report.save();
    } catch (error) {
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
      await report.save();
      throw error;
    }
  }

  async exportReport(
    id: string,
    format: string = 'pdf',
  ): Promise<{ url: string; format: string }> {
    const report = await this.getReportById(id);

    if (report.status !== ReportStatus.GENERATED) {
      throw new BadRequestException(
        'Report must be generated before exporting',
      );
    }

    // TODO: Implement actual file generation and upload to cloud storage
    // For now, return a placeholder
    const fileUrl = `/exports/report-${id}.${format}`;

    report.fileUrl = fileUrl;
    report.fileFormat = format;
    await report.save();

    return {
      url: fileUrl,
      format,
    };
  }

  async scheduleReport(scheduleData: any, userId: string): Promise<any> {
    // Create a scheduled report
    const report = new this.reportModel({
      name: scheduleData.name,
      type: scheduleData.type,
      period: scheduleData.period,
      status: ReportStatus.SCHEDULED,
      createdBy: new Types.ObjectId(userId),
      scheduledAt: new Date(
        `${scheduleData.scheduledDate}T${scheduleData.scheduledTime}`,
      ),
      // Store additional schedule configuration
      scheduleConfig: {
        frequency: scheduleData.frequency,
        recipients: scheduleData.recipients || [],
        autoExport: scheduleData.autoExport,
        exportFormat: scheduleData.exportFormat,
      },
    });

    await report.save();

    // TODO: Set up cron job or scheduled task for automatic generation
    // This would require a task scheduler like node-cron or Bull queue

    return report;
  }

  async bulkDeleteReports(ids: string[]): Promise<{ deleted: number }> {
    const result = await this.reportModel.deleteMany({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
    });

    return { deleted: result.deletedCount || 0 };
  }

  async bulkExportReports(
    ids: string[],
    format: string,
  ): Promise<{ files: Array<{ id: string; url: string }> }> {
    const reports = await this.reportModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      status: ReportStatus.GENERATED,
    });

    const files: Array<{ id: string; url: string }> = [];

    for (const report of reports) {
      const result = await this.exportReport(String(report._id), format);
      files.push({
        id: String(report._id),
        url: result.url,
      });
    }

    return { files };
  }
}
