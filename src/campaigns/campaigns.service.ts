import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignEvent } from './entities/campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { CampaignAnalyticsDto, DateRange } from './dto/campaign-analytics.dto';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<Campaign>,
    @InjectModel(CampaignEvent.name)
    private campaignEventModel: Model<CampaignEvent>,
  ) {}

  async create(
    createCampaignDto: CreateCampaignDto,
    userId: string,
  ): Promise<Campaign> {
    const campaign = new this.campaignModel({
      ...createCampaignDto,
      createdBy: userId,
    });
    return campaign.save();
  }

  async findAll(userId?: string, status?: string): Promise<Campaign[]> {
    const query: any = {};
    if (userId) query.createdBy = userId;
    if (status) query.status = status;

    return this.campaignModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Campaign | null> {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async update(
    id: string,
    updateCampaignDto: UpdateCampaignDto,
  ): Promise<Campaign | null> {
    const campaign = await this.campaignModel
      .findByIdAndUpdate(id, updateCampaignDto, { new: true })
      .exec();

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async remove(id: string): Promise<void> {
    const result = await this.campaignModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Campaign not found');
    }

    // Also delete all events for this campaign
    await this.campaignEventModel.deleteMany({ campaignId: id }).exec();
  }

  // Track campaign event (impression, click, conversion, etc.)
  async trackEvent(
    trackEventDto: TrackEventDto,
    req: any,
  ): Promise<CampaignEvent> {
    const { campaignId, eventType, value, metadata, ...eventData } =
      trackEventDto;

    // Create event
    const event = new this.campaignEventModel({
      campaignId,
      eventType,
      value: value || 0,
      metadata: metadata || {},
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      ...eventData,
    });
    await event.save();

    // Update campaign metrics
    const updateData: any = { lastTrackedAt: new Date() };

    switch (eventType) {
      case 'impression':
        updateData.$inc = { impressions: 1 };
        break;
      case 'click':
        updateData.$inc = { clicks: 1, uniqueVisitors: 1 };
        break;
      case 'conversion':
        updateData.$inc = { conversions: 1, revenue: value || 0 };
        break;
      case 'lead':
        updateData.$inc = { leads: 1 };
        break;
    }

    await this.campaignModel.findByIdAndUpdate(campaignId, updateData).exec();

    return event;
  }

  // Get campaign analytics
  async getAnalytics(
    id: string,
    analyticsDto: CampaignAnalyticsDto,
  ): Promise<any> {
    const campaign = await this.findOne(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const { startDate, endDate } = this.getDateRange(analyticsDto);

    // Get events in date range
    const events = await this.campaignEventModel
      .find({
        campaignId: id,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .exec();

    // Aggregate metrics
    const metrics = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      leads: 0,
      revenue: 0,
      uniqueUsers: new Set(),
      deviceBreakdown: {},
      sourceBreakdown: {},
      dailyData: {},
    };

    events.forEach((event) => {
      const eventDate = (event as any).createdAt || new Date();
      const dateKey = eventDate.toISOString().split('T')[0];

      if (!metrics.dailyData[dateKey]) {
        metrics.dailyData[dateKey] = {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
        };
      }

      switch (event.eventType) {
        case 'impression':
          metrics.impressions++;
          metrics.dailyData[dateKey].impressions++;
          break;
        case 'click':
          metrics.clicks++;
          metrics.dailyData[dateKey].clicks++;
          if (event.userId) metrics.uniqueUsers.add(event.userId.toString());
          break;
        case 'conversion':
          metrics.conversions++;
          metrics.revenue += event.value || 0;
          metrics.dailyData[dateKey].conversions++;
          metrics.dailyData[dateKey].revenue += event.value || 0;
          break;
        case 'lead':
          metrics.leads++;
          break;
      }

      // Device breakdown
      if (event.deviceType) {
        metrics.deviceBreakdown[event.deviceType] =
          (metrics.deviceBreakdown[event.deviceType] || 0) + 1;
      }

      // Source breakdown
      if (event.source) {
        metrics.sourceBreakdown[event.source] =
          (metrics.sourceBreakdown[event.source] || 0) + 1;
      }
    });

    const ctr =
      metrics.impressions > 0
        ? (metrics.clicks / metrics.impressions) * 100
        : 0;
    const conversionRate =
      metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0;
    const roi =
      campaign.spent > 0
        ? ((metrics.revenue - campaign.spent) / campaign.spent) * 100
        : 0;
    const cpc = metrics.clicks > 0 ? campaign.spent / metrics.clicks : 0;
    const cpa =
      metrics.conversions > 0 ? campaign.spent / metrics.conversions : 0;

    return {
      campaign: {
        id: campaign._id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        budget: campaign.budget,
        spent: campaign.spent,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
        leads: metrics.leads,
        revenue: metrics.revenue,
        uniqueUsers: metrics.uniqueUsers.size,
      },
      performance: {
        ctr: parseFloat(ctr.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
      },
      breakdown: {
        devices: metrics.deviceBreakdown,
        sources: metrics.sourceBreakdown,
      },
      timeline: metrics.dailyData,
    };
  }

  // Get top performing campaigns
  async getTopCampaigns(limit: number = 10): Promise<any[]> {
    const campaigns = await this.campaignModel
      .find({ status: 'active' })
      .sort({ conversions: -1, revenue: -1 })
      .limit(limit)
      .exec();

    return campaigns.map((campaign) => ({
      id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      conversions: campaign.conversions,
      revenue: campaign.revenue,
      roi:
        campaign.spent > 0
          ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100
          : 0,
      ctr:
        campaign.impressions > 0
          ? (campaign.clicks / campaign.impressions) * 100
          : 0,
    }));
  }

  // Compare campaigns
  async compareCampaigns(campaignIds: string[]): Promise<any> {
    const campaigns = await this.campaignModel
      .find({ _id: { $in: campaignIds } })
      .exec();

    return campaigns.map((campaign) => ({
      id: campaign._id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      budget: campaign.budget,
      spent: campaign.spent,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      revenue: campaign.revenue,
      ctr:
        campaign.impressions > 0
          ? (campaign.clicks / campaign.impressions) * 100
          : 0,
      conversionRate:
        campaign.clicks > 0
          ? (campaign.conversions / campaign.clicks) * 100
          : 0,
      roi:
        campaign.spent > 0
          ? ((campaign.revenue - campaign.spent) / campaign.spent) * 100
          : 0,
      cpc: campaign.clicks > 0 ? campaign.spent / campaign.clicks : 0,
      cpa: campaign.conversions > 0 ? campaign.spent / campaign.conversions : 0,
    }));
  }

  // Helper to get date range
  private getDateRange(analyticsDto: CampaignAnalyticsDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    if (analyticsDto.dateRange === DateRange.CUSTOM) {
      startDate = new Date(analyticsDto.startDate || now);
      endDate = new Date(analyticsDto.endDate || now);
    } else {
      switch (analyticsDto.dateRange) {
        case DateRange.TODAY:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case DateRange.YESTERDAY:
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case DateRange.LAST_7_DAYS:
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case DateRange.LAST_30_DAYS:
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case DateRange.THIS_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case DateRange.LAST_MONTH:
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }
    }

    return { startDate, endDate };
  }
}
