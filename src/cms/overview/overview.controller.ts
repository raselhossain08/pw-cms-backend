import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OverviewService } from './overview.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@ApiTags('CMS - Overview')
@Controller('cms/overview')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth('JWT-auth')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get CMS overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'CMS statistics retrieved successfully',
  })
  async getStats() {
    return this.overviewService.getStats();
  }

  @Get('sections')
  @ApiOperation({ summary: 'Get CMS sections overview' })
  @ApiResponse({
    status: 200,
    description: 'CMS sections retrieved successfully',
  })
  async getSections() {
    return this.overviewService.getSections();
  }

  @Get('export')
  @ApiOperation({ summary: 'Export CMS data' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv'], required: false })
  @ApiResponse({ status: 200, description: 'CMS data exported successfully' })
  async exportData(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Res() res: Response,
  ) {
    const result = await this.overviewService.exportData(format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cms-overview_${new Date().toISOString().split('T')[0]}.csv"`,
      );
      return res.send(result.data);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cms-overview_${new Date().toISOString().split('T')[0]}.json"`,
    );
    return res.json(result.data);
  }
}
