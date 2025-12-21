import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductCategoriesService } from './product-categories.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { GetProductCategoriesDto } from './dto/get-product-categories.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../shared/decorators/public.decorator';

@ApiTags('Product Categories')
@Controller('products/categories')
export class ProductCategoriesController {
  constructor(
    private readonly categoriesService: ProductCategoriesService,
  ) { }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all product categories with pagination' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll(@Query() params: GetProductCategoriesDto) {
    const result = await this.categoriesService.findAll(params);
    return {
      success: true,
      data: result,
    };
  }

  @Get('top-level')
  @Public()
  @ApiOperation({ summary: 'Get top-level categories (no parent)' })
  @ApiResponse({ status: 200, description: 'List of top-level categories' })
  async getTopLevelCategories() {
    const categories = await this.categoriesService.getTopLevelCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(id);
    return {
      success: true,
      data: category,
    };
  }

  @Get(':id/subcategories')
  @Public()
  @ApiOperation({ summary: 'Get subcategories of a category' })
  @ApiResponse({ status: 200, description: 'List of subcategories' })
  async getSubcategories(@Param('id') id: string) {
    const subcategories = await this.categoriesService.getSubcategories(id);
    return {
      success: true,
      data: subcategories,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Category already exists' })
  async create(@Body() createDto: CreateProductCategoryDto) {
    const category = await this.categoriesService.create(createDto);
    return {
      success: true,
      data: category,
      message: 'Category created successfully',
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a product category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateDto);
    return {
      success: true,
      data: category,
      message: 'Category updated successfully',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete category with products or subcategories' })
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }

  @Post('bulk/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk update category status' })
  @ApiResponse({ status: 200, description: 'Categories updated successfully' })
  async bulkUpdateStatus(
    @Body() body: { ids: string[]; status: 'active' | 'inactive' },
  ) {
    const result = await this.categoriesService.bulkUpdateStatus(
      body.ids,
      body.status,
    );
    return {
      success: true,
      data: result,
      message: `${result.updated} categories updated successfully`,
    };
  }

  @Post('bulk/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk delete categories' })
  @ApiResponse({ status: 200, description: 'Categories deleted' })
  async bulkDelete(@Body() body: { ids: string[] }) {
    const result = await this.categoriesService.bulkDelete(body.ids);
    return {
      success: true,
      data: result,
      message: `${result.deleted} categories deleted successfully`,
    };
  }
}
