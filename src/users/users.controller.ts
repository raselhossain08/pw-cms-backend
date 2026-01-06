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
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Public endpoint - no auth required
  @Get('instructor/:slug')
  @ApiOperation({
    summary: 'Get instructor profile by slug with courses (Public)',
  })
  @ApiResponse({ status: 200, description: 'Instructor profile with courses' })
  async getInstructorBySlug(@Param('slug') slug: string) {
    return this.usersService.getInstructorBySlug(slug);
  }

  // Protected endpoints below
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.findAll(page, limit, search, role);
  }

  @Get('instructors')
  @ApiOperation({ summary: 'Get all instructors' })
  @ApiResponse({ status: 200, description: 'List of instructors' })
  async getInstructors() {
    return this.usersService.getInstructors();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  async getStats() {
    return this.usersService.getStats();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.findById(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(@Req() req, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.update(userId, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changeMyPassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Delete('me')
  @ApiOperation({ summary: 'Delete my account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async removeMe(
    @Req() req,
    @Body() body?: { confirmation?: string; reason?: string },
  ) {
    const uid = req.user?.id || req.user?.userId;
    // Optional: Add confirmation check here if needed
    if (body?.confirmation && body.confirmation !== 'DELETE') {
      return { success: false, message: 'Invalid confirmation' };
    }
    return this.usersService.remove(uid);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me/export-data')
  @ApiOperation({ summary: 'Export user data' })
  @ApiResponse({ status: 200, description: 'User data exported' })
  async exportMyData(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.exportUserData(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('me/send-verification-email')
  @ApiOperation({ summary: 'Send verification email to current user' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendMyVerificationEmail(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    return this.usersService.sendVerificationEmail(userId);
  }

  @Put(':id/change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }

  @Post(':id/verify-email')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(@Param('id') id: string) {
    return this.usersService.verifyEmail(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({ status: 200, description: 'Notification preferences' })
  async getNotificationPreferences(@Req() req) {
    return this.usersService.getNotificationPreferences(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateNotificationPreferences(@Req() req, @Body() preferences: any) {
    return this.usersService.updateNotificationPreferences(
      req.user.id,
      preferences,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('privacy-settings')
  @ApiOperation({ summary: 'Get user privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings' })
  async getPrivacySettings(@Req() req) {
    return this.usersService.getPrivacySettings(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('privacy-settings')
  @ApiOperation({ summary: 'Update user privacy settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updatePrivacySettings(@Req() req, @Body() settings: any) {
    return this.usersService.updatePrivacySettings(req.user.id, settings);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile/stats')
  @ApiOperation({ summary: 'Get user profile statistics' })
  @ApiResponse({ status: 200, description: 'Profile statistics' })
  async getProfileStats(@Req() req) {
    return this.usersService.getProfileStats(req.user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update user status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.usersService.update(id, { status: body.status as any });
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Post('bulk/delete')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  async bulkDeleteUsers(@Body() body: { userIds: string[] }) {
    return this.usersService.bulkDeleteUsers(body.userIds);
  }

  @Put('bulk/update')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk update users' })
  @ApiResponse({ status: 200, description: 'Users updated successfully' })
  async bulkUpdateUsers(
    @Body() body: { userIds: string[]; status?: string; isActive?: boolean },
  ) {
    return this.usersService.bulkUpdateUsers(
      body.userIds,
      body.status as any,
      body.isActive,
    );
  }

  @Post(':id/send-verification-email')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send verification email to user' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async sendVerificationEmail(@Param('id') id: string) {
    return this.usersService.sendVerificationEmail(id);
  }

  @Post('api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate new API key' })
  @ApiResponse({ status: 201, description: 'API key generated' })
  async generateApiKey(@Req() req) {
    const userId = req.user?.id || req.user?.userId;
    const apiKey = await this.usersService.generateApiKey(userId);
    return { apiKey };
  }

  // ==================== STUDENT-SPECIFIC ENDPOINTS ====================

  @Get('students/:id/progress')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get detailed student progress with enrollments and quiz scores',
  })
  @ApiResponse({ status: 200, description: 'Student progress data' })
  async getStudentProgress(@Param('id') id: string) {
    return this.usersService.getStudentProgress(id);
  }

  @Post('students/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Import students from CSV/Excel file' })
  @ApiResponse({ status: 201, description: 'Students imported successfully' })
  async importStudents(
    @Body() body: { students: any[]; sendWelcomeEmail?: boolean },
  ) {
    return this.usersService.importStudents(
      body.students,
      body.sendWelcomeEmail,
    );
  }

  @Post('students/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send broadcast email to students' })
  @ApiResponse({
    status: 200,
    description: 'Broadcast email sent successfully',
  })
  async sendBroadcastToStudents(
    @Body()
    body: {
      subject: string;
      message: string;
      studentIds?: string[];
      courseId?: string;
    },
  ) {
    return this.usersService.sendBroadcastEmail(
      body.subject,
      body.message,
      body.studentIds,
      body.courseId,
    );
  }

  @Post('students/:id/message')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send individual message to student' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendMessageToStudent(
    @Param('id') id: string,
    @Body()
    body: {
      subject: string;
      message: string;
      type?: 'email' | 'notification' | 'both';
    },
  ) {
    return this.usersService.sendMessageToStudent(
      id,
      body.subject,
      body.message,
      body.type,
    );
  }
}
