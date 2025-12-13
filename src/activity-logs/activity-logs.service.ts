import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    ActivityLog,
    LogLevel,
    LogCategory,
} from './entities/activity-log.entity';
import { ErrorLog, ErrorSeverity } from './entities/error-log.entity';
import { AiLog, AiModel } from './entities/ai-log.entity';
import { ChatLog, ChatType } from './entities/chat-log.entity';
import { SystemLog, SystemEventType, SystemStatus } from './entities/system-log.entity';
import {
    QueryLogsDto,
    QueryErrorLogsDto,
    QueryAiLogsDto,
    QueryChatLogsDto,
    QuerySystemLogsDto,
} from './dto/query-logs.dto';

@Injectable()
export class ActivityLogsService {
    constructor(
        @InjectModel(ActivityLog.name)
        private activityLogModel: Model<ActivityLog>,
        @InjectModel(ErrorLog.name)
        private errorLogModel: Model<ErrorLog>,
        @InjectModel(AiLog.name)
        private aiLogModel: Model<AiLog>,
        @InjectModel(ChatLog.name)
        private chatLogModel: Model<ChatLog>,
        @InjectModel(SystemLog.name)
        private systemLogModel: Model<SystemLog>,
    ) { }

    // ==================== ACTIVITY LOGS ====================
    async getActivityLogs(query: QueryLogsDto) {
        const { page = 1, limit = 50, level, category, search, startDate, endDate, userId } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (level) filter.level = level;
        if (category) filter.category = category;
        if (userId) filter.userId = userId;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } },
            ];
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.activityLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'firstName lastName email')
                .lean()
                .exec(),
            this.activityLogModel.countDocuments(filter),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getActivityStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const [todayCount, yesterdayCount, totalErrors, criticalErrors] = await Promise.all([
            this.activityLogModel.countDocuments({ createdAt: { $gte: today } }),
            this.activityLogModel.countDocuments({
                createdAt: { $gte: yesterday, $lt: today },
            }),
            this.errorLogModel.countDocuments({ createdAt: { $gte: today } }),
            this.errorLogModel.countDocuments({
                severity: ErrorSeverity.CRITICAL,
                isResolved: false,
            }),
        ]);

        const percentageChange = yesterdayCount > 0
            ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
            : 0;

        return {
            totalToday: todayCount,
            totalYesterday: yesterdayCount,
            percentageChange: Math.round(percentageChange),
            totalErrors,
            criticalErrors,
        };
    }

    // ==================== ERROR LOGS ====================
    async getErrorLogs(query: QueryErrorLogsDto) {
        const { page = 1, limit = 50, severity, errorType, isResolved, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (severity) filter.severity = severity;
        if (errorType) filter.errorType = errorType;
        if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.errorLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.errorLogModel.countDocuments(filter),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getErrorStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalErrors, bySeverity, recentErrors] = await Promise.all([
            this.errorLogModel.countDocuments({ createdAt: { $gte: today } }),
            this.errorLogModel.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: '$severity', count: { $sum: 1 } } },
            ]),
            this.errorLogModel
                .find({ createdAt: { $gte: today } })
                .sort({ createdAt: -1 })
                .limit(10)
                .select('severity errorType message createdAt')
                .lean(),
        ]);

        return {
            totalErrors,
            bySeverity,
            recentErrors,
        };
    }

    // ==================== AI LOGS ====================
    async getAiLogs(query: QueryAiLogsDto) {
        const { page = 1, limit = 50, model, status, minResponseTime, maxResponseTime, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (model) filter.aiModel = model;
        if (status) filter.status = status;
        if (minResponseTime !== undefined || maxResponseTime !== undefined) {
            filter.responseTime = {};
            if (minResponseTime) filter.responseTime.$gte = minResponseTime;
            if (maxResponseTime) filter.responseTime.$lte = maxResponseTime;
        }
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.aiLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'firstName lastName email')
                .lean()
                .exec(),
            this.aiLogModel.countDocuments(filter),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getAiStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalInteractions, avgResponseTime, byModel, totalTokens] = await Promise.all([
            this.aiLogModel.countDocuments({ createdAt: { $gte: today } }),
            this.aiLogModel.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: null, avg: { $avg: '$responseTime' } } },
            ]),
            this.aiLogModel.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: '$aiModel', count: { $sum: 1 } } },
            ]),
            this.aiLogModel.aggregate([
                { $match: { createdAt: { $gte: today } } },
                { $group: { _id: null, total: { $sum: '$tokensUsed' } } },
            ]),
        ]);

        return {
            totalInteractions,
            avgResponseTime: avgResponseTime[0]?.avg || 0,
            byModel,
            totalTokens: totalTokens[0]?.total || 0,
        };
    }

    // ==================== CHAT LOGS ====================
    async getChatLogs(query: QueryChatLogsDto) {
        const { page = 1, limit = 50, chatType, conversationId, userId, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (chatType) filter.chatType = chatType;
        if (conversationId) filter.conversationId = conversationId;
        if (userId) filter.$or = [{ senderId: userId }, { receiverId: userId }];
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.chatLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('senderId', 'firstName lastName email')
                .populate('receiverId', 'firstName lastName email')
                .lean()
                .exec(),
            this.chatLogModel.countDocuments(filter),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getChatStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalChats, activeConversations, unreadMessages] = await Promise.all([
            this.chatLogModel.countDocuments({ createdAt: { $gte: today } }),
            this.chatLogModel.distinct('conversationId', { createdAt: { $gte: today } }),
            this.chatLogModel.countDocuments({ isRead: false }),
        ]);

        return {
            totalChats,
            activeConversations: activeConversations.length,
            unreadMessages,
        };
    }

    // ==================== SYSTEM LOGS ====================
    async getSystemLogs(query: QuerySystemLogsDto) {
        const { page = 1, limit = 50, eventType, status, requiresAction, startDate, endDate } = query;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (eventType) filter.eventType = eventType;
        if (status) filter.status = status;
        if (requiresAction !== undefined) filter.requiresAction = requiresAction === 'true';
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            this.systemLogModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.systemLogModel.countDocuments(filter),
        ]);

        return {
            success: true,
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getSystemStats() {
        const [healthyCount, warningCount, errorCount, criticalCount] = await Promise.all([
            this.systemLogModel.countDocuments({ status: SystemStatus.HEALTHY }),
            this.systemLogModel.countDocuments({ status: SystemStatus.WARNING }),
            this.systemLogModel.countDocuments({ status: SystemStatus.ERROR }),
            this.systemLogModel.countDocuments({ status: SystemStatus.CRITICAL }),
        ]);

        return {
            healthy: healthyCount,
            warning: warningCount,
            error: errorCount,
            critical: criticalCount,
        };
    }

    // ==================== CREATE LOGS ====================
    async createActivityLog(data: Partial<ActivityLog>) {
        return await this.activityLogModel.create(data);
    }

    async createErrorLog(data: Partial<ErrorLog>) {
        return await this.errorLogModel.create(data);
    }

    async createAiLog(data: Partial<AiLog>) {
        return await this.aiLogModel.create(data);
    }

    async createChatLog(data: Partial<ChatLog>) {
        return await this.chatLogModel.create(data);
    }

    async createSystemLog(data: Partial<SystemLog>) {
        return await this.systemLogModel.create(data);
    }

    // ==================== EXPORT ====================
    async exportLogs(type: string, query: any) {
        let logs: any[];

        switch (type) {
            case 'activity':
                logs = await this.activityLogModel.find(query).lean().exec();
                break;
            case 'error':
                logs = await this.errorLogModel.find(query).lean().exec();
                break;
            case 'ai':
                logs = await this.aiLogModel.find(query).lean().exec();
                break;
            case 'chat':
                logs = await this.chatLogModel.find(query).lean().exec();
                break;
            case 'system':
                logs = await this.systemLogModel.find(query).lean().exec();
                break;
            default:
                logs = [];
        }

        return {
            success: true,
            data: logs,
            count: logs.length,
        };
    }
}
