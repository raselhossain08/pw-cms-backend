import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CourseCategoriesService,
  CreateCategoryDto,
  UpdateCategoryDto,
  GetCategoriesParams,
} from './course-categories.service';
import { Public } from '../shared/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Course Categories')
@Controller('course-categories')
export class CourseCategoriesController {
  constructor(private readonly service: CourseCategoriesService) {}

  @Get('names')
  @Public()
  @ApiOperation({ summary: 'Get active category names only' })
  @ApiResponse({ status: 200, description: 'Array of category names' })
  async listNames() {
    return this.service.listActiveNames();
  }

  @Get('featured')
  @Public()
  @ApiOperation({ summary: 'Get featured categories with course counts' })
  @ApiResponse({ status: 200, description: 'Featured categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getFeatured(@Query('limit') limit?: number) {
    const data = await this.service.getFeatured(limit ? +limit : 5);
    return {
      success: true,
      data: {
        categories: data,
        total: data.length,
      },
    };
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getBySlug(@Param('slug') slug: string) {
    const data = await this.service.findBySlug(slug);
    return { success: true, data };
  }

  @Get('id/:id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  async getById(@Param('id') id: string) {
    const data = await this.service.findById(id);
    return { success: true, data };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated categories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, type: String })
  async list(@Query() params: GetCategoriesParams) {
    const data = await this.service.getAllWithCourseCount(params);
    return { success: true, data };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new course category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.service.add(dto);
    return { success: true, data, message: 'Category created successfully' };
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a course category' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  async update(@Param('slug') slug: string, @Body() dto: UpdateCategoryDto) {
    const data = await this.service.update(slug, dto);
    return { success: true, data, message: 'Category updated successfully' };
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a course category by slug' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  async remove(@Param('slug') slug: string) {
    await this.service.removeBySlug(slug);
    return { success: true, message: 'Category deleted successfully' };
  }
}
