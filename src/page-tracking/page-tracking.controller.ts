import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PageTrackingService } from './page-tracking.service';
import { TrackPageViewDto } from './dto/track-pageview.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { PageAnalyticsQueryDto } from './dto/page-analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('page-tracking')
export class PageTrackingController {
  constructor(private readonly pageTrackingService: PageTrackingService) {}

  @Post('pageview')
  trackPageView(@Body() trackPageViewDto: TrackPageViewDto, @Req() req) {
    return this.pageTrackingService.trackPageView(trackPageViewDto, req);
  }

  @Post('event')
  trackEvent(@Body() trackEventDto: TrackEventDto, @Req() req) {
    return this.pageTrackingService.trackEvent(trackEventDto, req);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPageAnalytics(@Query() query: PageAnalyticsQueryDto) {
    return this.pageTrackingService.getPageAnalytics(query);
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getSessionDetails(@Param('sessionId') sessionId: string) {
    return this.pageTrackingService.getSessionDetails(sessionId);
  }

  @Get('user-flow')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getUserFlow(@Query() query: PageAnalyticsQueryDto) {
    return this.pageTrackingService.getUserFlow(query);
  }

  @Get('heatmap/:page')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getHeatmapData(
    @Param('page') page: string,
    @Query('eventType') eventType: string = 'click',
  ) {
    return this.pageTrackingService.getHeatmapData(page, eventType);
  }

  @Get('active-users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getActiveUsers() {
    return this.pageTrackingService.getActiveUsers();
  }

  @Post('conversion-funnel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getConversionFunnel(@Body('steps') steps: string[]) {
    return this.pageTrackingService.getConversionFunnel(steps);
  }
}
