import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Query,
  Param,
  Req,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AnalyticsPeriod } from './dto/analytics-query.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

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

  @Get('chat')
  @ApiOperation({ summary: 'Get chat analytics' })
  @ApiQuery({
    name: 'period',
    enum: AnalyticsPeriod,
    required: false,
    description: 'Time period for analytics',
  })
  @ApiResponse({ status: 200, description: 'Chat analytics data' })
  async getChatAnalytics(@Query('period') period?: AnalyticsPeriod) {
    return this.analyticsService.getChatAnalytics(period || AnalyticsPeriod.MONTH);
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

  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Get course lessons analytics' })
  @ApiResponse({ status: 200, description: 'Course lessons analytics data' })
  async getCourseLessonsAnalytics(
    @Param('courseId') courseId: string,
    @Req() req,
  ) {
    return this.analyticsService.getCourseLessonsAnalytics(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  // ===== REPORTS CRUD OPERATIONS =====

  @Post('reports')
  @ApiOperation({ summary: 'Create a new analytics report' })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
    type: 'Report',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createReport(@Body() createReportDto: CreateReportDto, @Req() req) {
    return this.analyticsService.createReport(createReportDto, req.user.id);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get all analytics reports' })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filter by report type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by report status',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getAllReports(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Req() req?,
  ) {
    return this.analyticsService.getAllReports({
      type,
      status,
      limit,
      page,
      userId: req.user.id,
      userRole: req.user.role,
    });
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get a specific report by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReportById(@Param('id') id: string) {
    return this.analyticsService.getReportById(id);
  }

  @Put('reports/:id')
  @ApiOperation({ summary: 'Update an existing report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report updated successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateReport(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @Req() req,
  ) {
    return this.analyticsService.updateReport(id, updateReportDto, req.user.id);
  }

  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 204, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(@Param('id') id: string) {
    return this.analyticsService.deleteReport(id);
  }

  @Post('reports/:id/generate')
  @ApiOperation({ summary: 'Generate report data' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async generateReport(@Param('id') id: string) {
    return this.analyticsService.generateReport(id);
  }

  @Post('reports/:id/export')
  @ApiOperation({ summary: 'Export report to file' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiQuery({
    name: 'format',
    enum: ['pdf', 'csv', 'xlsx'],
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Export URL returned' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async exportReport(
    @Param('id') id: string,
    @Query('format') format: string = 'pdf',
  ) {
    return this.analyticsService.exportReport(id, format);
  }

  @Post('reports/schedule')
  @ApiOperation({ summary: 'Schedule a report for automatic generation' })
  @ApiResponse({ status: 201, description: 'Report scheduled successfully' })
  async scheduleReport(@Body() scheduleData: any, @Req() req) {
    return this.analyticsService.scheduleReport(scheduleData, req.user.id);
  }

  @Post('reports/bulk-delete')
  @ApiOperation({ summary: 'Bulk delete reports' })
  @ApiResponse({ status: 200, description: 'Reports deleted successfully' })
  async bulkDeleteReports(@Body('ids') ids: string[]) {
    return this.analyticsService.bulkDeleteReports(ids);
  }

  @Post('reports/bulk-export')
  @ApiOperation({ summary: 'Bulk export reports' })
  @ApiResponse({ status: 200, description: 'Bulk export completed' })
  async bulkExportReports(
    @Body('ids') ids: string[],
    @Body('format') format: string = 'pdf',
  ) {
    return this.analyticsService.bulkExportReports(ids, format);
  }
}
