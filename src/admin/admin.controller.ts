import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==================== DASHBOARD ====================
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('system/health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  // ==================== USER MANAGEMENT ====================
  @Get('users')
  getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers({ page, limit, role, status, search });
  }

  @Get('users/:id')
  getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateUserStatus(id, status);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ==================== COURSE MANAGEMENT ====================
  @Get('courses')
  getAllCourses(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllCourses({
      page,
      limit,
      status,
      category,
      search,
    });
  }

  @Post('courses/:id/approve')
  approveCourse(@Param('id') id: string) {
    return this.adminService.approveCourse(id);
  }

  @Post('courses/:id/reject')
  rejectCourse(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectCourse(id, reason);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  // ==================== ORDER MANAGEMENT ====================
  @Get('orders')
  getAllOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.adminService.getAllOrders({
      page,
      limit,
      status,
      paymentStatus,
    });
  }

  @Get('orders/:id')
  getOrderDetails(@Param('id') id: string) {
    return this.adminService.getOrderDetails(id);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateOrderStatus(id, status);
  }

  // ==================== REVIEW MODERATION ====================
  @Get('reviews/pending')
  getPendingReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingReviews(page, limit);
  }

  @Post('reviews/:id/approve')
  approveReview(@Param('id') id: string) {
    return this.adminService.approveReview(id);
  }

  @Post('reviews/:id/reject')
  rejectReview(@Param('id') id: string) {
    return this.adminService.rejectReview(id);
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(id);
  }

  // ==================== ANALYTICS & REPORTS ====================
  @Get('reports/revenue')
  getRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getRevenueReport(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('analytics/top-courses')
  getTopCourses(@Query('limit') limit?: number) {
    return this.adminService.getTopCourses(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('analytics/top-instructors')
  getTopInstructors(@Query('limit') limit?: number) {
    return this.adminService.getTopInstructors(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Get('coupons/stats')
  getCouponUsageStats() {
    return this.adminService.getCouponUsageStats();
  }

  // ==================== BULK OPERATIONS ====================
  @Patch('users/bulk/status')
  bulkUpdateUserStatus(
    @Body('userIds') userIds: string[],
    @Body('status') status: string,
  ) {
    return this.adminService.bulkUpdateUserStatus(userIds, status);
  }

  @Delete('users/bulk')
  bulkDeleteUsers(@Body('userIds') userIds: string[]) {
    return this.adminService.bulkDeleteUsers(userIds);
  }

  // ==================== INSTRUCTOR MANAGEMENT ====================
  @Get('instructors/pending')
  getPendingInstructors(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingInstructors(page, limit);
  }

  @Post('instructors/:id/approve')
  approveInstructor(@Param('id') id: string) {
    return this.adminService.approveInstructor(id);
  }

  @Post('instructors/:id/reject')
  rejectInstructor(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectInstructor(id, reason);
  }

  @Get('instructors/:id/stats')
  getInstructorStats(@Param('id') id: string) {
    return this.adminService.getInstructorStats(id);
  }

  // ==================== CONTENT MODERATION ====================
  @Get('content/flagged')
  getFlaggedContent(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getFlaggedContent(page, limit);
  }

  @Post('content/:id/flag')
  flagContent(
    @Param('id') id: string,
    @Body('contentType') contentType: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.flagContent(id, contentType, reason);
  }

  @Delete('content/:id/flag')
  unflagContent(
    @Param('id') id: string,
    @Body('contentType') contentType: string,
  ) {
    return this.adminService.unflagContent(id, contentType);
  }

  // ==================== PLATFORM STATS ====================
  @Get('platform/stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('platform/activity')
  getRecentActivity(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivity(
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  // ==================== SEARCH ====================
  @Get('search')
  searchAll(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.adminService.searchAll(
      query,
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  // ==================== EXPORT ====================
  @Get('export/users')
  exportUsers(@Query('role') role?: string, @Query('status') status?: string) {
    return this.adminService.exportUsers({ role, status });
  }

  @Get('export/orders')
  exportOrders(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.exportOrders(
      new Date(startDate),
      new Date(endDate),
    );
  }
}
