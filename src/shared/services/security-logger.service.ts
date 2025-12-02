import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum SecurityEventType {
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_VIOLATION = 'csrf_violation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  IP_BLOCKED = 'ip_blocked',
  MALICIOUS_PAYLOAD = 'malicious_payload',
  CORS_VIOLATION = 'cors_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class SecurityLog extends Document {
  @Prop({ required: true, enum: SecurityEventType })
  eventType: SecurityEventType;

  @Prop({ required: true, enum: ThreatLevel })
  threatLevel: ThreatLevel;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  userId?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  method?: string;

  @Prop({ type: Object })
  payload?: any;

  @Prop()
  userAgent?: string;

  @Prop()
  description: string;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedBy?: string;

  @Prop()
  notes?: string;
}

export const SecurityLogSchema = SchemaFactory.createForClass(SecurityLog);

// Indexes for fast queries
SecurityLogSchema.index({ eventType: 1, createdAt: -1 });
SecurityLogSchema.index({ ipAddress: 1, createdAt: -1 });
SecurityLogSchema.index({ threatLevel: 1, resolved: 1 });
SecurityLogSchema.index({ createdAt: -1 });

@Injectable()
export class SecurityLogger {
  constructor(
    @InjectModel(SecurityLog.name)
    private securityLogModel: Model<SecurityLog>,
  ) {}

  async logEvent(
    eventType: SecurityEventType,
    threatLevel: ThreatLevel,
    ipAddress: string,
    description: string,
    metadata?: {
      userId?: string;
      endpoint?: string;
      method?: string;
      payload?: any;
      userAgent?: string;
    },
  ): Promise<void> {
    try {
      await this.securityLogModel.create({
        eventType,
        threatLevel,
        ipAddress,
        description,
        ...metadata,
      });

      // Console log for immediate visibility
      const logLevel = this.getLogLevel(threatLevel);
      console[logLevel](
        `[SECURITY ${threatLevel.toUpperCase()}] ${eventType}: ${description} | IP: ${ipAddress}`,
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async getRateLimitViolations(hours = 24): Promise<SecurityLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.securityLogModel
      .find({
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        createdAt: { $gte: since },
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  async getBlockedIPs(hours = 24): Promise<string[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const logs = await this.securityLogModel
      .find({
        eventType: SecurityEventType.IP_BLOCKED,
        createdAt: { $gte: since },
      })
      .distinct('ipAddress')
      .exec();
    return logs;
  }

  async getThreatsByIP(ipAddress: string, days = 7): Promise<SecurityLog[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.securityLogModel
      .find({
        ipAddress,
        createdAt: { $gte: since },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSecurityMetrics(days = 30): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalEvents, byType, byThreat, unresolvedCritical] =
      await Promise.all([
        this.securityLogModel.countDocuments({ createdAt: { $gte: since } }),
        this.securityLogModel.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]),
        this.securityLogModel.aggregate([
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: '$threatLevel', count: { $sum: 1 } } },
        ]),
        this.securityLogModel.countDocuments({
          threatLevel: ThreatLevel.CRITICAL,
          resolved: false,
        }),
      ]);

    return {
      totalEvents,
      eventsByType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      eventsByThreat: byThreat.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      unresolvedCritical,
      period: `${days} days`,
    };
  }

  async resolveSecurityEvent(
    eventId: string,
    resolvedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.securityLogModel.findByIdAndUpdate(eventId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      notes,
    });
  }

  async getUnresolvedThreats(
    threatLevel?: ThreatLevel,
  ): Promise<SecurityLog[]> {
    const query: any = { resolved: false };
    if (threatLevel) {
      query.threatLevel = threatLevel;
    }
    return this.securityLogModel
      .find(query)
      .sort({ createdAt: -1, threatLevel: -1 })
      .limit(50)
      .exec();
  }

  private getLogLevel(threatLevel: ThreatLevel): 'log' | 'warn' | 'error' {
    switch (threatLevel) {
      case ThreatLevel.LOW:
        return 'log';
      case ThreatLevel.MEDIUM:
        return 'warn';
      case ThreatLevel.HIGH:
      case ThreatLevel.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }
}
