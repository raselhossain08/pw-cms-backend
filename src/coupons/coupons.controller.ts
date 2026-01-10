import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { Public } from '../shared/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { BulkDeleteDto, BulkToggleDto } from './dto/bulk-operations.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create coupon',
    description:
      'Create a new coupon with optional expiration date. ' +
      'The expiresAt field should be in ISO 8601 format (e.g., 2024-12-31T23:59:59.000Z). ' +
      'All dates are stored and returned in UTC timezone. ' +
      'If expiresAt is not provided or empty, the coupon will not expire.',
  })
  async create(@Body() body: CreateCouponDto) {
    return this.couponsService.create(body);
  }

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validate coupon code (public)' })
  async validate(@Body() body: { code: string; amount: number }) {
    const result = await this.couponsService.validate(body.code, body.amount);

    // Transform response to match frontend expectations
    if (result.valid && result.coupon) {
      return {
        valid: result.valid,
        discount: result.discount,
        coupon: {
          code: result.coupon.code,
          type: result.coupon.type,
          value: result.coupon.value,
        },
      };
    }

    return {
      valid: false,
      discount: 0,
      message:
        result.message || 'Invalid coupon code or does not meet requirements',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all coupons with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by code',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.couponsService.findAll(pageNum, limitNum, search);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get coupon analytics and statistics' })
  async getAnalytics() {
    return this.couponsService.getAnalytics();
  }

  @Get('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Get multiple coupons by IDs (placeholder - use POST bulk operations)',
  })
  async getBulk() {
    throw new BadRequestException(
      'Use POST /coupons/bulk/delete or POST /coupons/bulk/toggle-status for bulk operations',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get coupon by ID' })
  async findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update coupon',
    description:
      'Update an existing coupon. ' +
      'The expiresAt field should be in ISO 8601 format (e.g., 2024-12-31T23:59:59.000Z). ' +
      'To remove the expiration date, send an empty string or null for expiresAt. ' +
      'All dates are stored and returned in UTC timezone.',
  })
  async update(@Param('id') id: string, @Body() body: UpdateCouponDto) {
    return this.couponsService.update(id, body);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle coupon active status' })
  async toggleStatus(@Param('id') id: string) {
    return this.couponsService.toggleStatus(id);
  }

  @Post('bulk/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk delete coupons' })
  async bulkDelete(@Body() body: BulkDeleteDto) {
    return this.couponsService.bulkDelete(body.ids);
  }

  @Post('bulk/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk toggle coupon status' })
  async bulkToggleStatus(@Body() body: BulkToggleDto) {
    return this.couponsService.bulkToggleStatus(body.ids);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete coupon' })
  async remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
