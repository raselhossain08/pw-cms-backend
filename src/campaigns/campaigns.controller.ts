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
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { CampaignAnalyticsDto } from './dto/campaign-analytics.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Body() createCampaignDto: CreateCampaignDto, @Req() req) {
    return this.campaignsService.create(createCampaignDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(@Query('status') status?: string, @Req() req?) {
    return this.campaignsService.findAll(req?.user?.userId, status);
  }

  @Get('top')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTopCampaigns(@Query('limit') limit?: number) {
    return this.campaignsService.getTopCampaigns(limit || 10);
  }

  @Post('compare')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  compareCampaigns(@Body('campaignIds') campaignIds: string[]) {
    return this.campaignsService.compareCampaigns(campaignIds);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAnalytics(
    @Param('id') id: string,
    @Query() analyticsDto: CampaignAnalyticsDto,
  ) {
    return this.campaignsService.getAnalytics(id, analyticsDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  @Post('track')
  trackEvent(@Body() trackEventDto: TrackEventDto, @Req() req) {
    return this.campaignsService.trackEvent(trackEventDto, req);
  }
}
