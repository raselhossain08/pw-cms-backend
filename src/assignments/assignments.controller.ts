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
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create assignment' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  async create(
    @Param('courseId') courseId: string,
    @Body()
    body: {
      title: string;
      description: string;
      dueDate: Date;
      maxPoints?: number;
      attachments?: string[];
    },
    @Req() req,
  ) {
    return this.assignmentsService.create(courseId, req.user.id, body);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get course assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of assignments' })
  async getCourseAssignments(
    @Param('courseId') courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.assignmentsService.getCourseAssignments(courseId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({ status: 200, description: 'Assignment details' })
  async getAssignment(@Param('id') id: string) {
    return this.assignmentsService.getAssignment(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update assignment' })
  @ApiResponse({ status: 200, description: 'Assignment updated' })
  async update(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.assignmentsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete assignment' })
  @ApiResponse({ status: 200, description: 'Assignment deleted' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.assignmentsService.delete(id, req.user.id);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit assignment' })
  @ApiResponse({ status: 201, description: 'Assignment submitted' })
  async submit(
    @Param('id') id: string,
    @Body() body: { content: string; attachments?: string[] },
    @Req() req,
  ) {
    return this.assignmentsService.submitAssignment(id, req.user.id, body);
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get student submissions' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getMySubmissions(
    @Req() req,
    @Query('courseId') courseId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.assignmentsService.getStudentSubmissions(
      req.user.id,
      courseId,
      page,
      limit,
    );
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get submission by ID' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  async getSubmission(@Param('id') id: string, @Req() req) {
    return this.assignmentsService.getSubmission(id, req.user.id);
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get assignment submissions (Instructor)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getAssignmentSubmissions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.assignmentsService.getAssignmentSubmissions(id, page, limit);
  }

  @Post('submissions/:id/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Grade assignment submission' })
  @ApiResponse({ status: 200, description: 'Submission graded' })
  async grade(
    @Param('id') id: string,
    @Body() body: { grade: number; feedback?: string },
    @Req() req,
  ) {
    return this.assignmentsService.gradeSubmission(id, req.user.id, body);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get assignment statistics' })
  @ApiResponse({ status: 200, description: 'Assignment statistics' })
  async getStats(@Param('id') id: string) {
    return this.assignmentsService.getAssignmentStats(id);
  }
}
