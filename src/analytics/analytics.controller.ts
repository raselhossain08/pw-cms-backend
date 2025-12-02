import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnalyticsPeriod } from './dto/analytics-query.dto';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics data' })
  async getDashboardAnalytics() {
    return this.analyticsService.getDashboardAnalytics();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month', 'year'],
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Revenue analytics data' })
  async getRevenueAnalytics(@Query('period') period: string = 'month') {
    return this.analyticsService.getRevenueAnalytics(period as AnalyticsPeriod);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Get enrollment analytics' })
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month', 'year'],
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Enrollment analytics data' })
  async getEnrollmentAnalytics(@Query('period') period: string = 'month') {
    return this.analyticsService.getEnrollmentAnalytics(
      period as AnalyticsPeriod,
    );
  }

  @Get('course-performance')
  @ApiOperation({ summary: 'Get course performance analytics' })
  @ApiResponse({ status: 200, description: 'Course performance data' })
  async getCoursePerformance() {
    return this.analyticsService.getCoursePerformance();
  }

  @Get('student-progress')
  @ApiOperation({ summary: 'Get student progress analytics' })
  @ApiResponse({ status: 200, description: 'Student progress data' })
  async getStudentProgress() {
    return this.analyticsService.getStudentProgress();
  }

  @Get('instructor-performance')
  @ApiOperation({ summary: 'Get instructor performance analytics' })
  @ApiResponse({ status: 200, description: 'Instructor performance data' })
  async getInstructorPerformance() {
    return this.analyticsService.getInstructorPerformance();
  }

  @Get('geographic-distribution')
  @ApiOperation({ summary: 'Get geographic distribution of students' })
  @ApiResponse({ status: 200, description: 'Geographic distribution data' })
  async getGeographicDistribution() {
    return this.analyticsService.getGeographicDistribution();
  }

  @Get('conversion-rates')
  @ApiOperation({ summary: 'Get conversion rate analytics' })
  @ApiResponse({ status: 200, description: 'Conversion rate data' })
  async getConversionRates() {
    return this.analyticsService.getConversionRates();
  }
}
