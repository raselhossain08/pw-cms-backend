import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../analytics/entities/analytics.entity';
import { MailService } from '../notifications/mail.service';

@Injectable()
export class AnalyticsTasksService {
  private readonly logger = new Logger(AnalyticsTasksService.name);

  constructor(
    @InjectModel(AnalyticsEvent.name)
    private analyticsModel: Model<AnalyticsEvent>,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyAnalytics() {
    this.logger.log('Starting daily analytics aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Aggregate various metrics
      const [pageViews, uniqueVisitors, conversions, revenue] =
        await Promise.all([
          this.aggregatePageViews(yesterday, today),
          this.aggregateUniqueVisitors(yesterday, today),
          this.aggregateConversions(yesterday, today),
          this.aggregateRevenue(yesterday, today),
        ]);

      this.logger.log(`Daily analytics aggregated:
        Page Views: ${pageViews}
        Unique Visitors: ${uniqueVisitors}
        Conversions: ${conversions}
        Revenue: $${revenue}
      `);

      // Store aggregated data or send to data warehouse
      await this.storeAggregatedData({
        date: yesterday,
        pageViews,
        uniqueVisitors,
        conversions,
        revenue,
      });
    } catch (error) {
      this.logger.error(`Daily analytics aggregation failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReports() {
    this.logger.log('Generating weekly analytics reports...');

    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyStats = await this.getWeeklyStats(weekAgo);

      // Send report to admin
      await this.mailService.sendAdminAlert(
        'Weekly Analytics Report',
        `Weekly performance metrics for ${weekAgo.toDateString()} - ${new Date().toDateString()}`,
        weeklyStats,
      );

      this.logger.log('Weekly analytics report generated and sent');
    } catch (error) {
      this.logger.error(`Weekly report generation failed: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupOldAnalytics() {
    this.logger.log('Cleaning up old analytics data...');

    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const result = await this.analyticsModel.deleteMany({
        createdAt: { $lt: threeMonthsAgo },
      });

      this.logger.log(
        `Cleaned up ${result.deletedCount} old analytics records`,
      );
    } catch (error) {
      this.logger.error(`Analytics cleanup failed: ${error.message}`);
    }
  }

  // Aggregation methods
  private async aggregatePageViews(start: Date, end: Date): Promise<number> {
    return await this.analyticsModel.countDocuments({
      eventType: 'page_view',
      createdAt: { $gte: start, $lt: end },
    });
  }

  private async aggregateUniqueVisitors(
    start: Date,
    end: Date,
  ): Promise<number> {
    const result = await this.analyticsModel.aggregate([
      {
        $match: {
          eventType: 'page_view',
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $count: 'uniqueVisitors',
      },
    ]);

    return result[0]?.uniqueVisitors || 0;
  }

  private async aggregateConversions(start: Date, end: Date): Promise<number> {
    return await this.analyticsModel.countDocuments({
      eventType: { $in: ['purchase', 'course_enrollment'] },
      createdAt: { $gte: start, $lt: end },
    });
  }

  private async aggregateRevenue(start: Date, end: Date): Promise<number> {
    // This would aggregate from orders collection
    return 0;
  }

  private async storeAggregatedData(data: any): Promise<void> {
    // Store in a separate collection for reporting
    // Implementation depends on your data storage strategy
  }

  private async getWeeklyStats(startDate: Date): Promise<any> {
    const endDate = new Date();

    const [pageViews, uniqueVisitors, conversions, topPages, trafficSources] =
      await Promise.all([
        this.aggregatePageViews(startDate, endDate),
        this.aggregateUniqueVisitors(startDate, endDate),
        this.aggregateConversions(startDate, endDate),
        this.getTopPages(startDate, endDate),
        this.getTrafficSources(startDate, endDate),
      ]);

    return {
      period: { start: startDate, end: endDate },
      overview: {
        pageViews,
        uniqueVisitors,
        conversions,
        conversionRate:
          uniqueVisitors > 0 ? (conversions / uniqueVisitors) * 100 : 0,
      },
      topPages,
      trafficSources,
    };
  }

  private async getTopPages(start: Date, end: Date): Promise<any[]> {
    return await this.analyticsModel.aggregate([
      {
        $match: {
          eventType: 'page_view',
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$pageUrl',
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          pageUrl: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);
  }

  private async getTrafficSources(start: Date, end: Date): Promise<any[]> {
    return await this.analyticsModel.aggregate([
      {
        $match: {
          eventType: 'page_view',
          createdAt: { $gte: start, $lt: end },
          'properties.referrer': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$properties.referrer',
          visits: { $sum: 1 },
        },
      },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ]);
  }
}
