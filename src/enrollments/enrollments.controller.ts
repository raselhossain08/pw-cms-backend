import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EnrollmentsService } from './enrollments.service';
import {
  CreateEnrollmentDto,
  CreateEnrollmentAdminDto,
} from './dto/create-enrollment.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EnrollmentStatus } from './entities/enrollment.entity';

@ApiTags('Enrollments')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) { }

  @Post()
  @ApiOperation({ summary: 'Enroll in a course (free or paid with order)' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled' })
  async enroll(@Body() createEnrollmentDto: CreateEnrollmentDto, @Req() req) {
    return this.enrollmentsService.enroll(createEnrollmentDto, req.user.id);
  }

  @Post('free/:courseId')
  @ApiOperation({ summary: 'Enroll in a free course' })
  @ApiResponse({
    status: 201,
    description: 'Successfully enrolled in free course',
  })
  async enrollInFreeCourse(@Param('courseId') courseId: string, @Req() req) {
    return this.enrollmentsService.enroll({ courseId }, req.user.id);
  }

  @Get('my-enrollments')
  @ApiOperation({ summary: 'Get user enrollments' })
  @ApiQuery({ name: 'status', enum: EnrollmentStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  async getMyEnrollments(
    @Req() req,
    @Query('status') status?: EnrollmentStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.enrollmentsService.getUserEnrollments(
      req.user.id,
      status,
      page,
      limit,
    );
  }

  @Get('my-stats')
  @ApiOperation({ summary: 'Get user enrollment statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getMyStats(@Req() req) {
    return this.enrollmentsService.getUserStats(req.user.id);
  }

  @Get('available-courses')
  @ApiOperation({ summary: 'Get available courses (courses not yet enrolled in)' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiQuery({ name: 'isFree', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of available courses' })
  async getAvailableCourses(
    @Req() req,
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('isFree') isFree?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.enrollmentsService.getAvailableCourses(req.user.id, {
      category,
      level,
      isFree,
      search,
      page,
      limit,
    });
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get enrollment for a specific course' })
  @ApiResponse({ status: 200, description: 'Enrollment details' })
  async getEnrollment(@Param('courseId') courseId: string, @Req() req) {
    return this.enrollmentsService.getEnrollment(courseId, req.user.id);
  }

  @Get('course/:courseId/check')
  @ApiOperation({ summary: 'Check if enrolled in a course' })
  @ApiResponse({ status: 200, description: 'Enrollment status' })
  async checkEnrollment(@Param('courseId') courseId: string, @Req() req) {
    const isEnrolled = await this.enrollmentsService.isEnrolled(
      courseId,
      req.user.id,
    );
    return { enrolled: isEnrolled };
  }

  @Patch('course/:courseId/progress')
  @ApiOperation({ summary: 'Update course progress' })
  @ApiResponse({ status: 200, description: 'Progress updated' })
  async updateProgress(
    @Param('courseId') courseId: string,
    @Body() updateProgressDto: UpdateProgressDto,
    @Req() req,
  ) {
    return this.enrollmentsService.updateProgress(
      courseId,
      updateProgressDto,
      req.user.id,
    );
  }

  @Delete('course/:courseId')
  @ApiOperation({ summary: 'Unenroll from a course' })
  @ApiResponse({ status: 200, description: 'Successfully unenrolled' })
  async unenroll(@Param('courseId') courseId: string, @Req() req) {
    return this.enrollmentsService.unenroll(courseId, req.user.id);
  }

  @Get('course/:courseId/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get course enrollments (instructors only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of students enrolled' })
  async getCourseEnrollments(
    @Param('courseId') courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.enrollmentsService.getCourseEnrollments(courseId, page, limit);
  }

  @Get('course/:courseId/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get course enrollment stats' })
  @ApiResponse({ status: 200, description: 'Enrollment statistics' })
  async getCourseStats(@Param('courseId') courseId: string) {
    return this.enrollmentsService.getEnrollmentStats(courseId);
  }

  // Admin endpoints
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all enrollments (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: EnrollmentStatus })
  @ApiQuery({ name: 'instructorId', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'List of all enrollments' })
  async getAllEnrollments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: EnrollmentStatus,
    @Query('instructorId') instructorId?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.enrollmentsService.getAllEnrollments({
      page,
      limit,
      search,
      courseId,
      status,
      instructorId,
      sortBy,
      sortOrder,
    });
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get enrollment statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollment statistics' })
  async getAdminStats() {
    return this.enrollmentsService.getAdminStats();
  }

  @Get('admin/distribution')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get course enrollment distribution' })
  @ApiResponse({ status: 200, description: 'Course distribution data' })
  async getCourseDistribution() {
    return this.enrollmentsService.getCourseDistribution();
  }

  @Get('admin/trends')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get enrollment trends (admin)' })
  @ApiQuery({
    name: 'range',
    required: false,
    enum: ['7d', '30d', '90d', 'year'],
  })
  @ApiResponse({ status: 200, description: 'Enrollment trends data' })
  async getAdminTrends(
    @Query('range') range: '7d' | '30d' | '90d' | 'year' = '30d',
  ) {
    return this.enrollmentsService.getAdminTrends(range);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get enrollment by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollment details' })
  async getEnrollmentById(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentById(id);
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create enrollment (admin)' })
  @ApiResponse({ status: 201, description: 'Enrollment created' })
  async createEnrollmentAdmin(
    @Body() createEnrollmentDto: CreateEnrollmentAdminDto,
  ) {
    return this.enrollmentsService.createEnrollmentAdmin(createEnrollmentDto);
  }

  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update enrollment (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollment updated' })
  async updateEnrollmentAdmin(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    return this.enrollmentsService.updateEnrollmentAdmin(id, updateData);
  }

  @Delete('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete enrollment (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollment deleted' })
  async deleteEnrollmentAdmin(@Param('id') id: string) {
    return this.enrollmentsService.deleteEnrollmentAdmin(id);
  }

  @Post('admin/bulk-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk delete enrollments (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollments deleted' })
  async bulkDeleteEnrollments(@Body('ids') ids: string[]) {
    return this.enrollmentsService.bulkDeleteEnrollments(ids);
  }

  @Patch('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve pending enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment approved' })
  async approveEnrollmentAdmin(@Param('id') id: string) {
    return this.enrollmentsService.approveEnrollment(id);
  }

  @Patch('admin/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel enrollment' })
  @ApiResponse({ status: 200, description: 'Enrollment cancelled' })
  async cancelEnrollmentAdmin(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.enrollmentsService.cancelEnrollmentAdmin(id, reason);
  }

  @Get('admin/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export enrollments data' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx', 'pdf'] })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: EnrollmentStatus })
  @ApiResponse({ status: 200, description: 'Export file' })
  async exportEnrollments(
    @Query('format') format: 'csv' | 'xlsx' | 'pdf' = 'csv',
    @Query('courseId') courseId?: string,
    @Query('status') status?: EnrollmentStatus,
  ) {
    return this.enrollmentsService.exportEnrollments({
      format,
      courseId,
      status,
    });
  }

  // ==================== Purchase Tracking Endpoints ====================

  @Get('purchased-courses')
  @ApiOperation({ summary: 'Get all purchased courses with detailed stats' })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'accessType', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
  })
  @ApiResponse({ status: 200, description: 'Purchased courses with stats' })
  async getPurchasedCourses(
    @Req() req,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('accessType') accessType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.enrollmentsService.getPurchasedCourses(req.user.id, {
      paymentStatus,
      accessType,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Post('verify-purchase')
  @ApiOperation({ summary: 'Verify purchase and create enrollments' })
  @ApiResponse({
    status: 201,
    description: 'Enrollments created after purchase verification',
  })
  async verifyPurchase(
    @Req() req,
    @Body()
    body: {
      orderId: string;
      courses: Array<{ courseId: string; price: number }>;
      paymentData: {
        paymentMethod: string;
        transactionId?: string;
        totalAmount: number;
      };
    },
  ) {
    return this.enrollmentsService.verifyAndCreateEnrollments(
      req.user.id,
      body.orderId,
      body.courses,
      body.paymentData,
    );
  }

  @Patch(':enrollmentId/access')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update enrollment access (admin)' })
  @ApiResponse({ status: 200, description: 'Access updated' })
  async updateAccess(
    @Param('enrollmentId') enrollmentId: string,
    @Body() body: { hasAccess: boolean; reason?: string },
  ) {
    return this.enrollmentsService.updateAccess(
      enrollmentId,
      body.hasAccess,
      body.reason,
    );
  }

  @Post(':enrollmentId/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process refund and revoke access (admin)' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async processRefund(
    @Param('enrollmentId') enrollmentId: string,
    @Body('refundReason') refundReason: string,
  ) {
    return this.enrollmentsService.processRefund(enrollmentId, refundReason);
  }

  @Get('admin/purchase-analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get purchase analytics (admin/instructor)' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'instructorId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Purchase analytics data' })
  async getPurchaseAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courseId') courseId?: string,
    @Query('instructorId') instructorId?: string,
  ) {
    return this.enrollmentsService.getPurchaseAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      courseId,
      instructorId,
    });
  }

  // ==================== New Enhanced Operations ====================

  @Post('admin/bulk-update-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk update enrollment status (admin)' })
  @ApiResponse({ status: 200, description: 'Enrollments status updated' })
  async bulkUpdateStatus(
    @Body() body: { ids: string[]; status: EnrollmentStatus },
  ) {
    return this.enrollmentsService.bulkUpdateStatus(body.ids, body.status);
  }

  @Post('admin/:id/send-message')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Send message to enrolled student' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { subject: string; message: string },
  ) {
    return this.enrollmentsService.sendMessageToStudent({
      enrollmentId: id,
      subject: body.subject,
      message: body.message,
    });
  }

  @Post('admin/:id/generate-certificate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Generate certificate for completed enrollment' })
  @ApiResponse({ status: 200, description: 'Certificate generated' })
  async generateCertificate(@Param('id') id: string) {
    return this.enrollmentsService.generateCertificate(id);
  }

  @Get('admin/:id/audit-trail')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get enrollment audit trail' })
  @ApiResponse({ status: 200, description: 'Audit trail data' })
  async getAuditTrail(@Param('id') id: string) {
    return this.enrollmentsService.getEnrollmentAuditTrail(id);
  }

  @Get('admin/:id/payment-details')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get enrollment payment details' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  async getPaymentDetails(@Param('id') id: string) {
    return this.enrollmentsService.getPaymentDetails(id);
  }
}
