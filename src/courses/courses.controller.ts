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

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course lessons' })
  @ApiResponse({ status: 200, description: 'List of course lessons' })
  async getCourseLessons(@Param('id') id: string, @Req() req) {
    return this.coursesService.getCourseLessons(id, req.user.id, req.user.role);
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
}
