import { Controller, Get, Param, UseGuards, Query, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LMSConnectionsService } from '../services/lms-connections.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { Public } from '../decorators/public.decorator';

@ApiTags('LMS Connections')
@Controller('lms')
export class LMSConnectionsController {
  constructor(private readonly lmsConnectionsService: LMSConnectionsService) {}

  @Get('hierarchy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get complete LMS hierarchy' })
  @ApiResponse({ status: 200, description: 'LMS hierarchy with all entities' })
  async getCompleteHierarchy(@Req() req) {
    return this.lmsConnectionsService.getCompleteHierarchy(
      req.user.id,
      req.user.role,
    );
  }

  @Get('course/:courseId/structure')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get complete course structure with all related entities',
  })
  @ApiResponse({
    status: 200,
    description: 'Course with modules, lessons, assignments, quizzes',
  })
  async getCourseStructure(@Param('courseId') courseId: string, @Req() req) {
    return this.lmsConnectionsService.getCourseStructure(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('category/:categoryId/courses')
  @Public()
  @ApiOperation({ summary: 'Get all courses in a category with basic info' })
  @ApiResponse({ status: 200, description: 'List of courses in category' })
  async getCategoryCourses(
    @Param('categoryId') categoryId: string,
    @Query('includeModules') includeModules?: boolean,
  ) {
    return this.lmsConnectionsService.getCategoryCourses(
      categoryId,
      includeModules === true,
    );
  }

  @Get('module/:moduleId/content')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get module with all lessons, assignments, and quizzes',
  })
  @ApiResponse({ status: 200, description: 'Module with complete content' })
  async getModuleContent(@Param('moduleId') moduleId: string, @Req() req) {
    return this.lmsConnectionsService.getModuleContent(
      moduleId,
      req.user.id,
      req.user.role,
    );
  }

  @Get('student/progress/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get student progress for a course' })
  @ApiResponse({ status: 200, description: 'Detailed progress information' })
  async getStudentProgress(@Param('courseId') courseId: string, @Req() req) {
    return this.lmsConnectionsService.getStudentProgress(req.user.id, courseId);
  }

  @Get('instructor/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get instructor dashboard with all connected data' })
  @ApiResponse({ status: 200, description: 'Instructor dashboard data' })
  async getInstructorDashboard(@Req() req) {
    return this.lmsConnectionsService.getInstructorDashboard(
      req.user.id,
      req.user.role,
    );
  }

  @Get('navigation/breadcrumb/:entityType/:entityId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get breadcrumb navigation for any entity' })
  @ApiResponse({ status: 200, description: 'Breadcrumb trail' })
  async getBreadcrumb(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.lmsConnectionsService.getBreadcrumb(entityType, entityId);
  }

  @Get('certificate/eligible/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if student is eligible for course certificate',
  })
  @ApiResponse({ status: 200, description: 'Certificate eligibility status' })
  async checkCertificateEligibility(
    @Param('courseId') courseId: string,
    @Req() req,
  ) {
    return this.lmsConnectionsService.checkCertificateEligibility(
      req.user.id,
      courseId,
    );
  }
}
