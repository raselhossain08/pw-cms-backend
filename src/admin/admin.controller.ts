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
  constructor(private readonly adminService: AdminService) { }

  // ==================== INTEGRATIONS MANAGEMENT ====================
  @Get('integrations')
  getAllIntegrations() {
    return this.adminService.getAllIntegrations();
  }

  @Patch('integrations/:id')
  updateIntegration(@Param('id') id: string, @Body() updateData: any) {
    return this.adminService.updateIntegration(id, updateData);
  }

  @Post('integrations/:id/toggle')
  toggleIntegrationStatus(
    @Param('id') id: string,
    @Body('status') status: boolean,
  ) {
    return this.adminService.toggleIntegrationStatus(id, status);
  }

  // ==================== DASHBOARD ====================
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('system/health')
  getSystemHealth() {
    return this.adminService.getSystemHealth();
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

  // ==================== PAYMENT MANAGEMENT ====================
  @Get('payments/transactions')
  getAllTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAllTransactions({
      page,
      limit,
      status,
      method,
      search,
      startDate,
      endDate,
    });
  }

  @Get('payments/analytics')
  getPaymentAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getPaymentAnalytics({
      period,
      startDate,
      endDate,
    });
  }

  @Get('payments/invoices')
  getAllInvoices(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllInvoices({ page, limit, status, search });
  }

  @Get('payments/invoices/:id')
  getInvoiceById(@Param('id') id: string) {
    return this.adminService.getInvoiceById(id);
  }

  @Post('payments/invoices')
  createManualInvoice(@Body() invoiceData: any) {
    return this.adminService.createManualInvoice(invoiceData);
  }

  @Get('payments/transactions/:id')
  getTransactionDetails(@Param('id') id: string) {
    return this.adminService.getTransactionDetails(id);
  }

  @Post('payments/refund/:transactionId')
  processRefund(
    @Param('transactionId') transactionId: string,
    @Body() refundData: { reason: string; amount?: number },
  ) {
    return this.adminService.processRefund(transactionId, refundData);
  }

  @Get('payments/payouts')
  getInstructorPayouts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getInstructorPayouts({ page, limit, status });
  }

  @Post('payments/payouts/:instructorId/process')
  processInstructorPayout(
    @Param('instructorId') instructorId: string,
    @Body() payoutData: any,
  ) {
    return this.adminService.processInstructorPayout(instructorId, payoutData);
  }

  @Get('payments/export')
  exportPaymentReport(
    @Query('format') format?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.exportPaymentReport({
      format,
      startDate,
      endDate,
    });
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

  // ==================== SECURITY MANAGEMENT ====================
  @Get('security/blocked-ips')
  getBlockedIPs() {
    return this.adminService.getBlockedIPs();
  }

  @Post('security/unblock-ip')
  unblockIP(@Body('ip') ip: string) {
    return this.adminService.unblockIP(ip);
  }

  @Get('security/whitelisted-ips')
  getWhitelistedIPs() {
    return this.adminService.getWhitelistedIPs();
  }

  @Post('security/whitelist-ip')
  whitelistIP(@Body('ip') ip: string) {
    return this.adminService.whitelistIP(ip);
  }

  @Delete('security/whitelist-ip/:ip')
  removeFromWhitelist(@Param('ip') ip: string) {
    return this.adminService.removeFromWhitelist(ip);
  }

  // ==================== INSTRUCTOR MANAGEMENT ====================

  @Get('instructors/pending')
  getPendingInstructors(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getPendingInstructors(page, limit);
  }

  @Get('instructors/:id/stats')
  getInstructorStats(@Param('id') id: string) {
    return this.adminService.getInstructorStats(id);
  }

  @Post('instructors/:id/approve')
  approveInstructor(@Param('id') id: string) {
    return this.adminService.approveInstructor(id);
  }

  @Post('instructors/:id/reject')
  rejectInstructor(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.rejectInstructor(id, reason);
  }

  @Post('instructors/bulk-delete')
  bulkDeleteInstructors(@Body('ids') ids: string[]) {
    return this.adminService.bulkDeleteInstructors(ids);
  }

  @Post('instructors/bulk-status')
  bulkUpdateInstructorStatus(
    @Body('ids') ids: string[],
    @Body('status') status: string,
  ) {
    return this.adminService.bulkUpdateInstructorStatus(ids, status);
  }

  @Get('instructors/export')
  exportInstructors(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('specialization') specialization?: string,
    @Query('experience') experience?: string,
  ) {
    return this.adminService.exportInstructors({
      search,
      status,
      specialization,
      experience,
    });
  }

  @Get('instructors/analytics')
  getInstructorAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getInstructorAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('instructors/performance-tiers')
  getInstructorPerformanceTiers() {
    return this.adminService.getInstructorPerformanceTiers();
  }

  // ==================== STUDENT MANAGEMENT ====================

  @Get('students/stats')
  getStudentStats() {
    return this.adminService.getStudentStats();
  }

  @Get('students/:id/progress')
  getStudentProgress(@Param('id') id: string) {
    return this.adminService.getStudentProgress(id);
  }

  @Get('students/:id/stats')
  getStudentDetailedStats(@Param('id') id: string) {
    return this.adminService.getStudentDetailedStats(id);
  }

  @Post('students/bulk-delete')
  bulkDeleteStudents(@Body('ids') ids: string[]) {
    return this.adminService.bulkDeleteStudents(ids);
  }

  @Post('students/bulk-status')
  bulkUpdateStudentStatus(
    @Body('ids') ids: string[],
    @Body('status') status: string,
  ) {
    return this.adminService.bulkUpdateStudentStatus(ids, status);
  }

  @Get('students/export')
  exportStudents(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('course') course?: string,
    @Query('country') country?: string,
  ) {
    return this.adminService.exportStudents({
      search,
      status,
      course,
      country,
    });
  }

  @Post('students/import')
  importStudents(
    @Body('students') students: any[],
    @Body('sendWelcomeEmail') sendWelcomeEmail: boolean = false,
  ) {
    return this.adminService.importStudents(students, sendWelcomeEmail);
  }

  @Post('students/broadcast')
  sendBroadcastToStudents(
    @Body('subject') subject: string,
    @Body('message') message: string,
    @Body('studentIds') studentIds?: string[],
    @Body('courseId') courseId?: string,
  ) {
    return this.adminService.sendBroadcastToStudents({
      subject,
      message,
      studentIds,
      courseId,
    });
  }

  @Post('students/:id/message')
  sendMessageToStudent(
    @Param('id') id: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
    @Body('type') type: 'email' | 'notification' | 'both' = 'email',
  ) {
    return this.adminService.sendMessageToStudent(id, subject, message, type);
  }

  @Get('students/analytics')
  getStudentAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getStudentAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('students/performance-tiers')
  getStudentPerformanceTiers() {
    return this.adminService.getStudentPerformanceTiers();
  }

  // ==================== USER MANAGEMENT ====================

  @Get('users')
  getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers({ page, limit, role, status, search });
  }

  @Get('users/stats')
  getUsersStats() {
    return this.adminService.getUsersStats();
  }

  @Get('users/analytics')
  getUserAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getUserAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('users/:id/activity')
  getUserActivity(@Param('id') id: string, @Query('limit') limit: number = 50) {
    return this.adminService.getUserActivity(id, limit);
  }

  @Get('users/:id/details')
  getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/bulk-activate')
  bulkActivateUsers(@Body('ids') ids: string[]) {
    return this.adminService.bulkActivateUsers(ids);
  }

  @Post('users/bulk-deactivate')
  bulkDeactivateUsers(@Body('ids') ids: string[]) {
    return this.adminService.bulkDeactivateUsers(ids);
  }


  @Post('users/:id/send-verification-email')
  sendVerificationEmail(@Param('id') id: string) {
    return this.adminService.sendVerificationEmail(id);
  }

  @Post('users/:id/reset-password')
  resetUserPassword(
    @Param('id') id: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.adminService.resetUserPassword(id, newPassword);
  }

  @Get('users/export')
  exportUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.exportUsers({ role, status, search });
  }

  @Get('users/role-distribution')
  getRoleDistribution() {
    return this.adminService.getRoleDistribution();
  }

  @Get('users/activity-summary')
  getActivitySummary(@Query('days') days: number = 30) {
    return this.adminService.getActivitySummary(days);
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
}
