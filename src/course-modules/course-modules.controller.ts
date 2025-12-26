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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Course Modules')
@Controller('course-modules')
export class CourseModulesController {
  constructor(private readonly modulesService: CourseModulesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a module in a course' })
  @ApiResponse({ status: 201, description: 'Module created' })
  async create(@Body() dto: CreateCourseModuleDto, @Req() req) {
    return this.modulesService.create(dto, req.user.id, req.user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get modules with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('courseId') courseId?: string,
  ) {
    return this.modulesService.findAll(page, limit, courseId);
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get modules by course' })
  async findByCourse(@Param('courseId') courseId: string) {
    return this.modulesService.findByCourse(courseId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a module by ID' })
  async findOne(@Param('id') id: string) {
    return this.modulesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a module' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseModuleDto,
    @Req() req,
  ) {
    return this.modulesService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a module' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.modulesService.remove(id, req.user.id, req.user.role);
  }

  @Patch('course/:courseId/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder modules in a course' })
  async reorder(
    @Param('courseId') courseId: string,
    @Body('moduleIds') moduleIds: string[],
    @Req() req,
  ) {
    return this.modulesService.reorder(
      courseId,
      moduleIds,
      req.user.id,
      req.user.role,
    );
  }

  @Get(':id/lessons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get lessons in a module' })
  async getModuleLessons(@Param('id') id: string, @Req() req) {
    return this.modulesService.getModuleLessons(id, req.user.id, req.user.role);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle module status (published/draft)' })
  @ApiResponse({ status: 200, description: 'Module status toggled' })
  async toggleStatus(@Param('id') id: string, @Req() req) {
    return this.modulesService.toggleStatus(id, req.user.id, req.user.role);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Duplicate a module' })
  @ApiResponse({ status: 201, description: 'Module duplicated successfully' })
  async duplicate(@Param('id') id: string, @Req() req) {
    return this.modulesService.duplicate(id, req.user.id, req.user.role);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk delete modules' })
  @ApiResponse({ status: 200, description: 'Modules deleted' })
  async bulkDelete(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.modulesService.bulkDelete(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.deleted} module${result.deleted > 1 ? 's' : ''} deleted successfully`,
      ...result,
    };
  }

  @Post('bulk-toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk toggle module status' })
  @ApiResponse({ status: 200, description: 'Module statuses updated' })
  async bulkToggleStatus(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.modulesService.bulkToggleStatus(
      body.ids,
      req.user.id,
      req.user.role,
    );
    return {
      message: `${result.updated} module${result.updated > 1 ? 's' : ''} updated successfully`,
      ...result,
    };
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get module statistics' })
  @ApiResponse({ status: 200, description: 'Module statistics' })
  async getStats(@Param('id') id: string) {
    return this.modulesService.getModuleStats(id);
  }
}
