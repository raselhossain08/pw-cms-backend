import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PageView,
  UserSession,
  UserEvent,
  Heatmap,
} from './entities/page-tracking.entity';
import { TrackPageViewDto } from './dto/track-pageview.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { PageAnalyticsQueryDto } from './dto/page-analytics-query.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PageTrackingService {
  constructor(
    @InjectModel(PageView.name) private pageViewModel: Model<PageView>,
    @InjectModel(UserSession.name) private userSessionModel: Model<UserSession>,
    @InjectModel(UserEvent.name) private userEventModel: Model<UserEvent>,
    @InjectModel(Heatmap.name) private heatmapModel: Model<Heatmap>,
  ) {}

  // Track page view
  async trackPageView(
    trackPageViewDto: TrackPageViewDto,
    req: any,
  ): Promise<any> {
    const sessionId = trackPageViewDto.sessionId || uuidv4();
    const userId = req.user?.userId;

    // Create page view
    const pageView = new this.pageViewModel({
      ...trackPageViewDto,
      userId,
      sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await pageView.save();

    // Update or create session
    let session = await this.userSessionModel.findOne({ sessionId }).exec();

    if (!session) {
      session = new this.userSessionModel({
        sessionId,
        userId,
        startTime: new Date(),
        landingPage: trackPageViewDto.page,
        referrer: trackPageViewDto.referrer,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        pageViews: 1,
        pagesVisited: [trackPageViewDto.page],
      });
    } else {
      session.pageViews += 1;
      session.endTime = new Date();
      session.duration = Math.floor(
        (session.endTime.getTime() - session.startTime.getTime()) / 1000,
      );
      session.exitPage = trackPageViewDto.page;

      if (!session.pagesVisited.includes(trackPageViewDto.page)) {
        session.pagesVisited.push(trackPageViewDto.page);
      }
    }

    await session.save();

    return { sessionId, pageViewId: pageView._id };
  }

  // Track user event (clicks, scrolls, etc.)
  async trackEvent(trackEventDto: TrackEventDto, req: any): Promise<UserEvent> {
    const event = new this.userEventModel({
      ...trackEventDto,
      userId: req.user?.userId,
    });
    await event.save();

    // Update heatmap data for click events
    if (
      trackEventDto.eventType === 'click' &&
      trackEventDto.positionX &&
      trackEventDto.positionY
    ) {
      await this.updateHeatmap(
        trackEventDto.page || '',
        'click',
        trackEventDto.positionX,
        trackEventDto.positionY,
      );
    }

    return event;
  }

  // Update heatmap data
  private async updateHeatmap(
    page: string,
    eventType: string,
    x: number,
    y: number,
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const heatmapPoint = await this.heatmapModel
      .findOne({
        page,
        eventType,
        x: { $gte: x - 10, $lte: x + 10 },
        y: { $gte: y - 10, $lte: y + 10 },
        date: today,
      })
      .exec();

    if (heatmapPoint) {
      heatmapPoint.count += 1;
      await heatmapPoint.save();
    } else {
      const newPoint = new this.heatmapModel({
        page,
        eventType,
        x,
        y,
        count: 1,
        date: today,
      });
      await newPoint.save();
    }
  }

  // Get page analytics
  async getPageAnalytics(query: PageAnalyticsQueryDto): Promise<any> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const matchQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (query.page) {
      matchQuery.page = query.page;
    }

    const pageViews = await this.pageViewModel.find(matchQuery).exec();

    const analytics = {
      totalPageViews: pageViews.length,
      uniqueVisitors: new Set(
        pageViews.map((pv) => pv.userId?.toString()).filter(Boolean),
      ).size,
      avgTimeOnPage: 0,
      avgScrollDepth: 0,
      bounceRate: 0,
      conversionRate: 0,
      topPages: {},
      deviceBreakdown: {},
      browserBreakdown: {},
      countryBreakdown: {},
      dailyPageViews: {},
    };

    let totalTimeOnPage = 0;
    let totalScrollDepth = 0;
    let bounces = 0;
    let conversions = 0;

    pageViews.forEach((pv) => {
      // Time and scroll metrics
      totalTimeOnPage += pv.timeOnPage || 0;
      totalScrollDepth += pv.scrollDepth || 0;

      if (pv.bounced) bounces++;
      if (pv.converted) conversions++;

      // Top pages
      analytics.topPages[pv.page] = (analytics.topPages[pv.page] || 0) + 1;

      // Device breakdown
      if (pv.deviceType) {
        analytics.deviceBreakdown[pv.deviceType] =
          (analytics.deviceBreakdown[pv.deviceType] || 0) + 1;
      }

      // Browser breakdown
      if (pv.browser) {
        analytics.browserBreakdown[pv.browser] =
          (analytics.browserBreakdown[pv.browser] || 0) + 1;
      }

      // Country breakdown
      if (pv.country) {
        analytics.countryBreakdown[pv.country] =
          (analytics.countryBreakdown[pv.country] || 0) + 1;
      }

      // Daily page views
      const pvDate = (pv as any).createdAt || new Date();
      const dateKey = pvDate.toISOString().split('T')[0];
      analytics.dailyPageViews[dateKey] =
        (analytics.dailyPageViews[dateKey] || 0) + 1;
    });

    analytics.avgTimeOnPage =
      pageViews.length > 0 ? Math.round(totalTimeOnPage / pageViews.length) : 0;
    analytics.avgScrollDepth =
      pageViews.length > 0
        ? Math.round(totalScrollDepth / pageViews.length)
        : 0;
    analytics.bounceRate =
      pageViews.length > 0
        ? parseFloat(((bounces / pageViews.length) * 100).toFixed(2))
        : 0;
    analytics.conversionRate =
      pageViews.length > 0
        ? parseFloat(((conversions / pageViews.length) * 100).toFixed(2))
        : 0;

    // Convert topPages object to sorted array
    const topPagesArray = Object.entries(analytics.topPages)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => (b.views as number) - (a.views as number))
      .slice(0, 10);

    return {
      ...analytics,
      topPages: topPagesArray,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  // Get session details
  async getSessionDetails(sessionId: string): Promise<any> {
    const session = await this.userSessionModel.findOne({ sessionId }).exec();
    if (!session) {
      return null;
    }

    const pageViews = await this.pageViewModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .exec();
    const events = await this.userEventModel
      .find({ sessionId })
      .sort({ createdAt: 1 })
      .exec();

    return {
      session,
      pageViews,
      events,
    };
  }

  // Get user behavior flow
  async getUserFlow(query: PageAnalyticsQueryDto): Promise<any> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const sessions = await this.userSessionModel
      .find({
        startTime: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const flow = {};

    sessions.forEach((session) => {
      for (let i = 0; i < session.pagesVisited.length - 1; i++) {
        const from = session.pagesVisited[i];
        const to = session.pagesVisited[i + 1];
        const key = `${from} -> ${to}`;
        flow[key] = (flow[key] || 0) + 1;
      }
    });

    return Object.entries(flow)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => (b.count as number) - (a.count as number))
      .slice(0, 20);
  }

  // Get heatmap data
  async getHeatmapData(
    page: string,
    eventType: string = 'click',
  ): Promise<Heatmap[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return this.heatmapModel
      .find({
        page,
        eventType,
        date: { $gte: sevenDaysAgo },
      })
      .exec();
  }

  // Get real-time active users
  async getActiveUsers(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const activeSessions = await this.userSessionModel
      .countDocuments({
        endTime: { $gte: fiveMinutesAgo },
      })
      .exec();

    return activeSessions;
  }

  // Get conversion funnel
  async getConversionFunnel(steps: string[]): Promise<any> {
    const funnel: Array<{ step: string; visitors: number }> = [];

    for (const step of steps) {
      const count = await this.pageViewModel
        .countDocuments({ page: step })
        .exec();
      funnel.push({ step, visitors: count });
    }

    return funnel;
  }
}
