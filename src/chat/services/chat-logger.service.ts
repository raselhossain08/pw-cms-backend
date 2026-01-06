import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatEventLog } from '../entities/chat-log.entity';

@Injectable()
export class ChatLoggerService {
  private readonly logger = new Logger(ChatLoggerService.name);

  constructor(
    @InjectModel(ChatEventLog.name)
    private readonly chatLogModel: Model<ChatEventLog>,
  ) {}

  async logMessage(
    conversationId: string,
    messageId: string,
    senderId: string,
    senderType: 'user' | 'agent' | 'ai',
    content: string,
    messageType: string = 'text',
    metadata?: any,
  ): Promise<void> {
    try {
      await this.chatLogModel.create({
        conversationId,
        messageId,
        senderId,
        senderType,
        content,
        messageType,
        metadata,
        timestamp: new Date(),
      });

      this.logger.debug(
        `Message logged: ${senderType} message in conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to log message:', error);
    }
  }

  async logAIResponse(
    conversationId: string,
    messageId: string,
    userMessage: string,
    aiResponse: string,
    confidence: number,
    intent: string,
    provider: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.chatLogModel.create({
        conversationId,
        messageId,
        senderId: 'ai-system',
        senderType: 'ai',
        content: aiResponse,
        messageType: 'ai_response',
        metadata: {
          ...metadata,
          userMessage,
          confidence,
          intent,
          provider,
          responseTime: new Date(),
        },
        timestamp: new Date(),
      });

      this.logger.log(
        `AI response logged: ${intent} with confidence ${confidence} in conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to log AI response:', error);
    }
  }

  async logError(
    conversationId: string,
    errorType: string,
    errorMessage: string,
    context: any,
  ): Promise<void> {
    try {
      await this.chatLogModel.create({
        conversationId,
        senderId: 'system',
        senderType: 'system',
        content: errorMessage,
        messageType: 'error',
        metadata: {
          errorType,
          context,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      });

      this.logger.error(
        `Error logged: ${errorType} in conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error('Failed to log error:', error);
    }
  }

  async logConversationStart(
    conversationId: string,
    userId: string,
    initialMessage: string,
    channel: string = 'web',
  ): Promise<void> {
    try {
      await this.chatLogModel.create({
        conversationId,
        senderId: userId,
        senderType: 'user',
        content: initialMessage,
        messageType: 'conversation_start',
        metadata: {
          channel,
          startTime: new Date(),
        },
        timestamp: new Date(),
      });

      this.logger.log(
        `Conversation started: ${conversationId} by user ${userId}`,
      );
    } catch (error) {
      this.logger.error('Failed to log conversation start:', error);
    }
  }

  async logConversationEnd(
    conversationId: string,
    endReason: string,
    duration: number,
    messageCount: number,
  ): Promise<void> {
    try {
      await this.chatLogModel.create({
        conversationId,
        senderId: 'system',
        senderType: 'system',
        content: `Conversation ended: ${endReason}`,
        messageType: 'conversation_end',
        metadata: {
          endReason,
          duration,
          messageCount,
          endTime: new Date(),
        },
        timestamp: new Date(),
      });

      this.logger.log(
        `Conversation ended: ${conversationId} after ${duration}ms with ${messageCount} messages`,
      );
    } catch (error) {
      this.logger.error('Failed to log conversation end:', error);
    }
  }

  async getConversationLogs(conversationId: string): Promise<ChatEventLog[]> {
    return this.chatLogModel
      .find({ conversationId })
      .sort({ timestamp: 1 })
      .exec();
  }

  async getAIPerformanceMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalResponses: number;
    averageConfidence: number;
    topIntents: { intent: string; count: number }[];
    errorRate: number;
  }> {
    const logs = await this.chatLogModel
      .find({
        messageType: 'ai_response',
        timestamp: { $gte: startDate, $lte: endDate },
      })
      .exec();

    const totalResponses = logs.length;
    const averageConfidence =
      logs.reduce((sum, log) => sum + (log.metadata?.confidence || 0), 0) /
        totalResponses || 0;

    const intentCounts = logs.reduce((acc, log) => {
      const intent = log.metadata?.intent || 'unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});

    const topIntents = Object.entries(intentCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count: count as number }));

    const errorLogs = await this.chatLogModel.countDocuments({
      messageType: 'error',
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const errorRate =
      totalResponses > 0 ? (errorLogs / totalResponses) * 100 : 0;

    return {
      totalResponses,
      averageConfidence,
      topIntents,
      errorRate,
    };
  }

  async getSatisfactionMetrics(dateRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<{ averageRating: number }> {
    // Placeholder implementation - in future this should query a satisfaction/feedback collection
    return { averageRating: 0 };
  }

  async logAnalyticsEvent(eventType: string, data: any): Promise<void> {
    this.logger.log(`Analytics event [${eventType}]: ${JSON.stringify(data)}`);
  }
}
