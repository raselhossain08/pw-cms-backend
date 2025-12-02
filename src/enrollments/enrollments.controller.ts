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
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
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
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, description: 'Successfully enrolled' })
  async enroll(@Body() createEnrollmentDto: CreateEnrollmentDto, @Req() req) {
    return this.enrollmentsService.enroll(createEnrollmentDto, req.user.id);
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
}
