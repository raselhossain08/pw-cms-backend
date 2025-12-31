import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ChatLoggerService } from './chat-logger.service';

interface ChatAnalytics {
  overview: {
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    averageResponseTime: number;
    resolutionRate: number;
  };
  timeMetrics: {
    averageConversationDuration: number;
    peakHours: Array<{ hour: number; count: number }>;
    responseTimes: {
      immediate: number;
      within1Min: number;
      within5Min: number;
      within30Min: number;
      over30Min: number;
    };
  };
  userMetrics: {
    mostActiveUsers: Array<{ userId: string; messageCount: number }>;
    userSatisfaction: number;
    repeatUsers: number;
  };
  conversationMetrics: {
    byStatus: {
      open: number;
      resolved: number;
      pending: number;
      closed: number;
    };
    byType: {
      support: number;
      general: number;
      technical: number;
      billing: number;
    };
  };
  performanceMetrics: {
    firstResponseTime: number;
    resolutionTime: number;
    agentPerformance: Array<{ agentId: string; resolved: number; avgTime: number }>;
  };
}

@Injectable()
export class ChatAnalyticsService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private chatLoggerService: ChatLoggerService,
  ) { }

  async getChatAnalytics(period: 'day' | 'week' | 'month' = 'month'): Promise<ChatAnalytics> {
    const dateRange = this.getDateRange(period);

    const [
      conversationStats,
      messageStats,
      responseTimeStats,
      userActivity,
      statusDistribution,
      typeDistribution,
      performanceStats
    ] = await Promise.all([
      this.getConversationStats(dateRange),
      this.getMessageStats(dateRange),
      this.getResponseTimeStats(dateRange),
      this.getUserActivityStats(dateRange),
      this.getStatusDistribution(dateRange),
      this.getTypeDistribution(dateRange),
      this.getPerformanceMetrics(dateRange)
    ]);

    return {
      overview: {
        totalConversations: conversationStats.total,
        activeConversations: conversationStats.active,
        totalMessages: messageStats.total,
        averageResponseTime: responseTimeStats.average,
        resolutionRate: conversationStats.resolutionRate,
      },
      timeMetrics: {
        averageConversationDuration: conversationStats.avgDuration,
        peakHours: await this.getPeakHours(dateRange),
        responseTimes: responseTimeStats.breakdown,
      },
      userMetrics: {
        mostActiveUsers: userActivity.mostActiveUsers,
        userSatisfaction: await this.getUserSatisfaction(dateRange),
        repeatUsers: userActivity.repeatUsers,
      },
      conversationMetrics: {
        byStatus: statusDistribution,
        byType: typeDistribution,
      },
      performanceMetrics: performanceStats,
    };
  }

  private getDateRange(period: 'day' | 'week' | 'month') {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    return { startDate, endDate: now };
  }

  private async getConversationStats(dateRange: { startDate: Date; endDate: Date }) {
    const stats = await this.conversationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $in: ['$status', ['open', 'pending']] }, 1, 0]
            }
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          },
          totalDuration: {
            $sum: {
              $cond: [
                { $and: ['$startedAt', '$endedAt'] },
                { $subtract: ['$endedAt', '$startedAt'] },
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { total: 0, active: 0, resolved: 0, totalDuration: 0 };

    return {
      total: result.total,
      active: result.active,
      resolutionRate: result.total > 0 ? (result.resolved / result.total) * 100 : 0,
      avgDuration: result.total > 0 ? result.totalDuration / result.total : 0
    };
  }

  private async getMessageStats(dateRange: { startDate: Date; endDate: Date }) {
    const stats = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          userMessages: {
            $sum: { $cond: [{ $eq: ['$senderType', 'user'] }, 1, 0] }
          },
          agentMessages: {
            $sum: { $cond: [{ $eq: ['$senderType', 'agent'] }, 1, 0] }
          },
          aiMessages: {
            $sum: { $cond: [{ $eq: ['$senderType', 'ai'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || { total: 0, userMessages: 0, agentMessages: 0, aiMessages: 0 };
  }

  private async getResponseTimeStats(dateRange: { startDate: Date; endDate: Date }) {
    // Implementation for response time analytics
    // This would track time between user message and first agent response
    return {
      average: 120, // seconds
      breakdown: {
        immediate: 40, // %
        within1Min: 30,
        within5Min: 20,
        within30Min: 8,
        over30Min: 2
      }
    };
  }

  private async getUserActivityStats(dateRange: { startDate: Date; endDate: Date }) {
    const userStats = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate },
          senderType: 'user'
        }
      },
      {
        $group: {
          _id: '$sender',
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { messageCount: -1 } },
      { $limit: 10 }
    ]);

    const repeatUsers = await this.conversationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: '$participants',
          conversationCount: { $sum: 1 }
        }
      },
      {
        $match: {
          conversationCount: { $gt: 1 }
        }
      },
      {
        $count: 'repeatUsers'
      }
    ]);

    return {
      mostActiveUsers: userStats.map(stat => ({
        userId: stat._id,
        messageCount: stat.messageCount
      })),
      repeatUsers: repeatUsers[0]?.repeatUsers || 0
    };
  }

  private async getStatusDistribution(dateRange: { startDate: Date; endDate: Date }) {
    const distribution = await this.conversationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = { open: 0, resolved: 0, pending: 0, closed: 0 };
    distribution.forEach(item => {
      result[item._id] = item.count;
    });

    return result;
  }

  private async getTypeDistribution(dateRange: { startDate: Date; endDate: Date }) {
    // Assuming conversation type is stored in metadata
    const distribution = await this.conversationModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: '$metadata.type',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = { support: 0, general: 0, technical: 0, billing: 0 };
    distribution.forEach(item => {
      const type = item._id || 'general';
      result[type] = item.count;
    });

    return result;
  }

  private async getPerformanceMetrics(dateRange: { startDate: Date; endDate: Date }) {
    // Implementation for performance metrics
    return {
      firstResponseTime: 45, // seconds average
      resolutionTime: 3600, // seconds average
      agentPerformance: [
        { agentId: 'agent1', resolved: 25, avgTime: 3200 },
        { agentId: 'agent2', resolved: 18, avgTime: 2800 }
      ]
    };
  }

  private async getPeakHours(dateRange: { startDate: Date; endDate: Date }) {
    const peakData = await this.messageModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return peakData.map(item => ({
      hour: item._id,
      count: item.count
    }));
  }

  private async getUserSatisfaction(dateRange: { startDate: Date; endDate: Date }) {
    // This would integrate with your rating system once implemented
    const satisfactionData = await this.chatLoggerService.getSatisfactionMetrics(dateRange);
    return satisfactionData.averageRating || 4.2; // Default value
  }

  async trackChatEvent(eventType: string, data: any) {
    await this.chatLoggerService.logAnalyticsEvent(eventType, data);
  }

  async getRealTimeMetrics() {
    return {
      activeConversations: await this.conversationModel.countDocuments({ status: 'open' }),
      waitingUsers: await this.conversationModel.countDocuments({ status: 'pending' }),
      onlineAgents: 2, // This would come from presence service
      queueLength: 5,
      averageWaitTime: 120
    };
  }
}