import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ReviewRefundDto } from './dto/review-refund.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  create(@Body() createRefundDto: CreateRefundDto, @Req() req) {
    return this.refundsService.createRefund(createRefundDto, req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.refundsService.findAll({ page, limit, status });
  }

  @Get('my-refunds')
  getUserRefunds(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.refundsService.getUserRefunds(req.user.userId, page, limit);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getRefundStats() {
    return this.refundsService.getRefundStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewRefund(
    @Param('id') id: string,
    @Body() reviewRefundDto: ReviewRefundDto,
    @Req() req,
  ) {
    return this.refundsService.reviewRefund(
      id,
      reviewRefundDto,
      req.user.userId,
    );
  }

  @Post(':id/process')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  processRefund(@Param('id') id: string) {
    return this.refundsService.processRefund(id);
  }

  @Delete(':id')
  cancelRefund(@Param('id') id: string, @Req() req) {
    return this.refundsService.cancelRefund(id, req.user.userId);
  }
}
