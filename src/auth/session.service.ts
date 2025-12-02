import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserSession, SessionStatus } from './entities/user-session.entity';
import { SecurityLog, SecurityEventType } from './entities/security-log.entity';
import { LoginAttempt, AttemptStatus } from './entities/login-attempt.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(UserSession.name) private sessionModel: Model<UserSession>,
    @InjectModel(SecurityLog.name) private securityLogModel: Model<SecurityLog>,
    @InjectModel(LoginAttempt.name)
    private loginAttemptModel: Model<LoginAttempt>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    sessionData: {
      ipAddress: string;
      userAgent: string;
      location?: string;
      browser?: string;
      os?: string;
      deviceType?: string;
      metadata?: any;
    },
  ): Promise<{
    sessionToken: string;
    refreshToken: string;
    session: UserSession;
  }> {
    const sessionToken = this.generateSessionToken();
    const refreshToken = this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session = new this.sessionModel({
      user: new Types.ObjectId(userId),
      sessionToken,
      refreshToken,
      expiresAt,
      ...sessionData,
    });

    await session.save();

    return {
      sessionToken,
      refreshToken,
      session,
    };
  }

  async validateSession(sessionToken: string): Promise<UserSession> {
    const session = await this.sessionModel
      .findOne({
        sessionToken,
        status: SessionStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
      })
      .populate('user')
      .exec();

    if (!session) {
      throw new BadRequestException('Invalid or expired session');
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    return session;
  }

  async refreshSession(
    oldRefreshToken: string,
    sessionData: any,
  ): Promise<{ sessionToken: string; refreshToken: string }> {
    const session = await this.sessionModel.findOne({
      refreshToken: oldRefreshToken,
      status: SessionStatus.ACTIVE,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new BadRequestException('Invalid refresh token');
    }

    // Revoke old session
    session.status = SessionStatus.REVOKED;
    session.revocationReason = 'Refreshed';
    await session.save();

    // Create new session
    const newSessionToken = this.generateSessionToken();
    const newRefreshToken = this.generateRefreshToken();

    const newSession = new this.sessionModel({
      user: session.user,
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ...sessionData,
    });

    await newSession.save();

    return {
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
    };
  }

  async revokeSession(
    sessionToken: string,
    reason: string = 'User initiated',
  ): Promise<void> {
    const session = await this.sessionModel.findOne({ sessionToken });

    if (session) {
      session.status = SessionStatus.REVOKED;
      session.revocationReason = reason;
      session.revokedAt = new Date();
      await session.save();
    }
  }

  async revokeAllUserSessions(
    userId: string,
    reason: string = 'Security policy',
  ): Promise<number> {
    const result = await this.sessionModel.updateMany(
      {
        user: new Types.ObjectId(userId),
        status: SessionStatus.ACTIVE,
      },
      {
        status: SessionStatus.REVOKED,
        revocationReason: reason,
        revokedAt: new Date(),
      },
    );

    return result.modifiedCount;
  }

  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await this.sessionModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async logSecurityEvent(
    userId: string,
    eventType: SecurityEventType,
    eventData: {
      description: string;
      ipAddress?: string;
      userAgent?: string;
      location?: string;
      metadata?: any;
      isSuccess?: boolean;
      failureReason?: string;
    },
  ): Promise<SecurityLog> {
    const log = new this.securityLogModel({
      user: new Types.ObjectId(userId),
      eventType,
      ...eventData,
    });

    return await log.save();
  }

  async logLoginAttempt(attemptData: {
    userId?: string;
    email: string;
    status: AttemptStatus;
    ipAddress: string;
    userAgent?: string;
    location?: string;
    failureReason?: string;
    context?: string;
    metadata?: any;
  }): Promise<LoginAttempt> {
    const attempt = new this.loginAttemptModel(attemptData);
    return await attempt.save();
  }

  async getRecentFailedAttempts(
    email: string,
    hours: number = 1,
  ): Promise<number> {
    const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await this.loginAttemptModel.countDocuments({
      email,
      status: AttemptStatus.FAILED,
      createdAt: { $gte: timeThreshold },
    });
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const timeThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes

    const recentLock = await this.loginAttemptModel.findOne({
      email,
      status: AttemptStatus.BLOCKED,
      createdAt: { $gte: timeThreshold },
    });

    return !!recentLock;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionModel.deleteMany({
      expiresAt: { $lt: new Date() },
      status: SessionStatus.ACTIVE,
    });

    return result.deletedCount;
  }

  private generateSessionToken(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateRefreshToken(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}
