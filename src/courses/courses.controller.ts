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
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CourseStatus } from './entities/course.entity';
import { Public } from '../shared/decorators/public.decorator';
import { CourseAccessGuard } from './guards/course-access.guard';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  async create(@Body() createCourseDto: CreateCourseDto, @Req() req) {
    return this.coursesService.create(createCourseDto, req.user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all courses with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CourseStatus })
  @ApiResponse({ status: 200, description: 'List of courses' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('level') level?: string,
    @Query('status') status?: CourseStatus,
  ) {
    return this.coursesService.findAll(page, limit, search, level, status);
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured courses' })
  @ApiResponse({ status: 200, description: 'List of featured courses' })
  async getFeaturedCourses(@Query('limit') limit: number = 6) {
    return this.coursesService.getFeaturedCourses(limit);
  }

  @Get('instructor/my-courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get instructor courses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of instructor courses' })
  async getInstructorCourses(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.coursesService.getInstructorCourses(req.user.id, page, limit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course statistics' })
  @ApiResponse({ status: 200, description: 'Course statistics' })
  async getStats() {
    return this.coursesService.getStats();
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get course by slug' })
  @ApiResponse({ status: 200, description: 'Course details' })
  async findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiResponse({ status: 200, description: 'Course details' })
  async findOne(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update course' })
  @ApiResponse({ status: 200, description: 'Course updated' })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req,
  ) {
    return this.coursesService.update(
      id,
      updateCourseDto,
      req.user.id,
      req.user.role,
    );
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update course (PUT)' })
  @ApiResponse({ status: 200, description: 'Course updated' })
  async updatePut(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() req,
  ) {
    return this.coursesService.update(
      id,
      updateCourseDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.coursesService.remove(id, req.user.id, req.user.role);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Publish a course' })
  @ApiResponse({ status: 200, description: 'Course published successfully' })
  async publish(@Param('id') id: string, @Req() req) {
    return this.coursesService.publish(id, req.user.id, req.user.role);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unpublish a course' })
  @ApiResponse({ status: 200, description: 'Course unpublished successfully' })
  async unpublish(@Param('id') id: string, @Req() req) {
    return this.coursesService.unpublish(id, req.user.id, req.user.role);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Duplicate a course' })
  @ApiResponse({ status: 201, description: 'Course duplicated successfully' })
  async duplicate(@Param('id') id: string, @Req() req) {
    return this.coursesService.duplicate(id, req.user.id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle course status (published/draft)' })
  @ApiResponse({ status: 200, description: 'Course status toggled' })
  async toggleStatus(@Param('id') id: string, @Req() req) {
    return this.coursesService.toggleStatus(id, req.user.id, req.user.role);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk delete courses' })
  @ApiResponse({ status: 200, description: 'Courses deleted' })
  async bulkDelete(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkDelete(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.deleted} course${result.deleted > 1 ? 's' : ''} deleted successfully`,
      ...result,
    };
  }

  @Post('bulk-toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk toggle course status' })
  @ApiResponse({ status: 200, description: 'Course statuses updated' })
  async bulkToggleStatus(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkToggleStatus(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.updated} course${result.updated > 1 ? 's' : ''} updated successfully`,
      ...result,
    };
  }

  @Post('bulk-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk publish courses' })
  @ApiResponse({ status: 200, description: 'Courses published' })
  async bulkPublish(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkPublish(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.published} course${result.published > 1 ? 's' : ''} published successfully`,
      ...result,
    };
  }

  @Post('bulk-unpublish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk unpublish courses' })
  @ApiResponse({ status: 200, description: 'Courses unpublished' })
  async bulkUnpublish(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkUnpublish(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.unpublished} course${result.unpublished > 1 ? 's' : ''} unpublished successfully`,
      ...result,
    };
  }

  // Lesson endpoints
  @Post(':id/lessons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add lesson to course' })
  @ApiResponse({ status: 201, description: 'Lesson created successfully' })
  async createLesson(
    @Param('id') id: string,
    @Body() createLessonDto: CreateLessonDto,
    @Req() req,
  ) {
    return this.coursesService.createLesson(id, createLessonDto, req.user.id);
  }

  @Get(':id/lessons')
  @UseGuards(JwtAuthGuard, CourseAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course lessons (requires enrollment)' })
  @ApiResponse({ status: 200, description: 'List of course lessons' })
  async getCourseLessons(@Param('id') id: string, @Req() req) {
    return this.coursesService.getCourseLessons(id, req.user.id, req.user.role);
  }

  @Get('lessons/:lessonId')
  @UseGuards(JwtAuthGuard, CourseAccessGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get lesson by ID (requires enrollment)' })
  @ApiResponse({ status: 200, description: 'Lesson details' })
  async getLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.coursesService.getLesson(lessonId, req.user.id, req.user.role);
  }

  @Patch('lessons/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson updated' })
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() updateData: any,
    @Req() req,
  ) {
    return this.coursesService.updateLesson(
      lessonId,
      updateData,
      req.user.id,
      req.user.role,
    );
  }

  @Delete('lessons/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiResponse({ status: 200, description: 'Lesson deleted' })
  async deleteLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.coursesService.deleteLesson(
      lessonId,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/lessons/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder lessons in a course' })
  @ApiResponse({ status: 200, description: 'Lessons reordered' })
  async reorderLessons(
    @Param('id') courseId: string,
    @Body() body: { lessonIds: string[]; moduleId?: string },
    @Req() req,
  ) {
    return this.coursesService.reorderLessons(
      courseId,
      body.lessonIds,
      req.user.id,
      req.user.role,
      body.moduleId,
    );
  }

  @Patch('lessons/:lessonId/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle lesson status (published/draft)' })
  @ApiResponse({ status: 200, description: 'Lesson status toggled' })
  async toggleLessonStatus(
    @Param('lessonId') lessonId: string,
    @Req() req,
  ) {
    return this.coursesService.toggleLessonStatus(
      lessonId,
      req.user.id,
      req.user.role,
    );
  }

  @Post('lessons/bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk delete lessons' })
  @ApiResponse({ status: 200, description: 'Lessons deleted' })
  async bulkDeleteLessons(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkDeleteLessons(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.deleted} lesson${result.deleted > 1 ? 's' : ''} deleted successfully`,
      ...result,
    };
  }

  @Post('lessons/bulk-toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk toggle lesson status' })
  @ApiResponse({ status: 200, description: 'Lesson statuses updated' })
  async bulkToggleLessonStatus(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.coursesService.bulkToggleLessonStatus(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.updated} lesson${result.updated > 1 ? 's' : ''} updated successfully`,
      ...result,
    };
  }
}
