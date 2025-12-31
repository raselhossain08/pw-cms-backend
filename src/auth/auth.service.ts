import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../notifications/mail.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailVerification } from './entities/email-verification.entity';
import { SessionService } from './session.service';
import { SecurityConfigService } from '../config/security.config';
import { LoginAttempt, AttemptStatus } from './entities/login-attempt.entity';
import { SecurityLog, SecurityEventType } from './entities/security-log.entity';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private securityConfig: SecurityConfigService,
    private mailService: MailService,
    private sessionService: SessionService,
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerification>,
    @InjectModel(LoginAttempt.name)
    private loginAttemptModel: Model<LoginAttempt>,
    @InjectModel(SecurityLog.name)
    private securityLogModel: Model<SecurityLog>,
  ) { }

  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Validate password strength
    const passwordValidation = this.securityConfig.validatePassword(
      registerDto.password,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password requirements not met: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password with stronger salt rounds
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const verificationToken = this.jwtService.sign(
      { sub: user.id, email: user.email, type: 'email_verification' },
      { expiresIn: '24h', jwtid: crypto.randomBytes(16).toString('hex') },
    );

    await this.emailVerificationModel.create({
      user: user.id,
      token: verificationToken,
      email: user.email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      type: 'signup',
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.emailVerificationModel.create({
      user: user.id,
      token: code,
      email: user.email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      type: 'otp',
    });

    const activationLink = `${this.configService.get('FRONTEND_URL')}/activate-account?token=${verificationToken}`;
    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        verificationToken,
        code,
      );
    } catch (e) {
      console.error('Email send failed:', (e as Error)?.message);
    }

    // Log security event
    await this.logSecurityEvent({
      userId: user.id,
      type: 'user_registered',
      description: 'New user registration',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    const { password, ...result } = user.toObject();
    return {
      user: result,
      message:
        'Registration successful. Please check your email for verification.',
      activationLink,
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    // Check login attempts and rate limiting
    const attemptCount = await this.getRecentLoginAttempts(
      loginDto.email,
      ipAddress,
    );
    if (attemptCount >= this.MAX_LOGIN_ATTEMPTS) {
      await this.logSecurityEvent({
        type: 'login_attempt_blocked',
        description: 'Too many failed login attempts',
        ipAddress,
        userAgent,
        metadata: { email: loginDto.email, attemptCount },
      });

      throw new ForbiddenException(
        'Too many failed login attempts. Please try again later or reset your password.',
      );
    }

    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      // Record failed attempt
      await this.recordLoginAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
      );

      await this.logSecurityEvent({
        type: 'login_failed',
        description: 'Failed login attempt',
        ipAddress,
        userAgent,
        metadata: { email: loginDto.email },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await this.recordLoginAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
      );
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    if (user.status !== 'active') {
      await this.recordLoginAttempt(
        loginDto.email,
        ipAddress,
        userAgent,
        false,
      );
      throw new UnauthorizedException('Your account has been deactivated');
    }

    // Record successful attempt and clear previous failures
    await this.recordLoginAttempt(loginDto.email, ipAddress, userAgent, true);
    await this.clearFailedAttempts(loginDto.email, ipAddress);

    const tokens = await this.generateTokens(user);

    // Update last login and create session
    await this.usersService.updateLastLogin(user.id);
    const sessionResult = await this.sessionService.createSession(user.id, {
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      deviceType: this.getDeviceType(userAgent),
      browser: this.getBrowser(userAgent),
      location: 'Unknown', // Would be determined from IP in production
      metadata: {},
    });

    await this.logSecurityEvent({
      userId: user.id,
      type: 'login_successful',
      description: 'User logged in successfully',
      ipAddress,
      userAgent,
      metadata: { email: user.email },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async generateTokens(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      jti: crypto.randomBytes(16).toString('hex'), // Unique token identifier
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.convertJwtExpiresIn(this.securityConfig.jwtExpiresIn),
      issuer: 'personal-wings-api',
      audience: 'personal-wings-users',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      issuer: 'personal-wings-api',
      audience: 'personal-wings-users',
    });

    // Store refresh token with additional security metadata
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.securityConfig.jwtExpiresIn,
      tokenType: 'Bearer',
    };
  }

  async refreshToken(user: any) {
    return this.generateTokens(user);
  }

  async refreshWithToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new BadRequestException('Invalid or expired refresh token');
      }
      return this.generateTokens(user);
    } catch (e) {
      throw new BadRequestException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logout successful' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal if user exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '1h' },
    );

    await this.usersService.setPasswordResetToken(user.id, resetToken);
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async verifyEmailToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const record = await this.emailVerificationModel.findOne({ token });
      if (!record || record.isUsed) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      await this.usersService.verifyEmail(String(record.user));
      record.isUsed = true;
      record.usedAt = new Date();
      await record.save();

      return { message: 'Email verified successfully' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async verifyEmailCode(code: string) {
    if (!code || code.length !== 6) {
      throw new BadRequestException('Invalid verification code');
    }
    const record = await this.emailVerificationModel.findOne({
      token: code,
      type: 'otp',
    });
    if (!record || record.isUsed || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.usersService.verifyEmail(String(record.user));
    record.isUsed = true;
    record.usedAt = new Date();
    await record.save();

    return { message: 'Email verified successfully' };
  }

  async resendVerification(token?: string, email?: string) {
    try {
      let user;

      if (token) {
        const payload = this.jwtService.verify(token);
        user = await this.usersService.findById(payload.sub);
      } else if (email) {
        user = await this.usersService.findByEmail(email);
      }

      if (!user) throw new BadRequestException('Invalid request');
      if (user.emailVerified)
        throw new BadRequestException('Email already verified');

      // Generate new verification token
      const verificationToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '24h' },
      );

      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Invalidate previous codes for this user? Optional but good practice.
      // For now just create new one.
      await this.emailVerificationModel.create({
        user: user.id,
        token: code,
        email: user.email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        type: 'otp',
      });

      // We should also update the link token?
      // The original implementation didn't update the link token in the emailVerificationModel for 'signup' type,
      // but sent a token in the email.
      // We will send the new token in the email.

      await this.mailService.sendVerificationEmail(
        user.email,
        verificationToken,
        code,
      );
      return { message: 'Verification email resent' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired token/email');
    }
  }

  async resendVerificationForUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '24h' },
    );

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await this.emailVerificationModel.create({
      user: user.id,
      token: code,
      email: user.email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      type: 'otp',
    });

    try {
      await this.mailService.sendVerificationEmail(
        user.email,
        verificationToken,
        code,
      );
      return { message: 'Verification email resent' };
    } catch (e) {
      throw new BadRequestException('Failed to send verification email');
    }
  }

  async getEmailStatus(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new BadRequestException('User not found');
    return {
      emailVerified: user.emailVerified || false,
      email: user.email,
    };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);
    return {
      sessions: sessions.map((session: any) => ({
        _id: String(session._id || session.id),
        device: session.deviceType || 'Unknown',
        browser: session.browser || 'Unknown',
        ip: session.ipAddress || 'Unknown',
        location: session.location || 'Unknown',
        lastActive:
          session.lastActivity?.toISOString() ||
          session.createdAt?.toISOString() ||
          new Date().toISOString(),
        isCurrent:
          session.status === 'active' &&
          new Date(session.expiresAt) > new Date(),
      })),
    };
  }

  async deleteSession(userId: string, sessionId: string) {
    const sessions = await this.sessionService.getUserSessions(userId);
    const targetSession = sessions.find(
      (s: any) => String(s._id || s.id) === sessionId,
    );
    if (!targetSession) {
      throw new BadRequestException('Session not found');
    }
    await this.sessionService.revokeSession(
      targetSession.sessionToken,
      'User deleted session',
    );
    return { message: 'Session deleted' };
  }

  async deleteAllSessions(userId: string) {
    await this.sessionService.revokeAllUserSessions(
      userId,
      'User logged out all sessions',
    );
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'All sessions deleted' };
  }

  // ============ SECURITY HELPER METHODS ============

  private async recordLoginAttempt(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = false,
  ) {
    await this.loginAttemptModel.create({
      email,
      ipAddress: ipAddress || 'Unknown',
      userAgent,
      status: success ? AttemptStatus.SUCCESS : AttemptStatus.FAILED,
      timestamp: new Date(),
    });

    // Clean up old attempts
    await this.loginAttemptModel.deleteMany({
      timestamp: { $lt: new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW) },
    });
  }

  private async getRecentLoginAttempts(
    email: string,
    ipAddress?: string,
  ): Promise<number> {
    const windowStart = new Date(Date.now() - this.LOGIN_ATTEMPT_WINDOW);

    const attempts = await this.loginAttemptModel.countDocuments({
      $or: [{ email }, { ipAddress }],
      timestamp: { $gte: windowStart },
      success: false,
    });

    return attempts;
  }

  private async clearFailedAttempts(email: string, ipAddress?: string) {
    await this.loginAttemptModel.deleteMany({
      $or: [{ email }, { ipAddress }],
      success: false,
    });
  }

  private async logSecurityEvent(event: {
    userId?: string;
    type: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    // Map string type to SecurityEventType enum
    const eventType = this.mapEventTypeToEnum(event.type);

    await this.securityLogModel.create({
      user: event.userId,
      eventType,
      description: event.description,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      metadata: event.metadata,
      timestamp: new Date(),
    });
  }

  private mapEventTypeToEnum(type: string): SecurityEventType {
    const typeMap: Record<string, SecurityEventType> = {
      user_registered: SecurityEventType.PROFILE_UPDATE,
      login_attempt_blocked: SecurityEventType.ACCOUNT_LOCKED,
      login_failed: SecurityEventType.LOGIN,
      login_successful: SecurityEventType.LOGIN,
      password_reset_requested: SecurityEventType.PASSWORD_CHANGE,
      password_reset_successful: SecurityEventType.PASSWORD_CHANGE,
      email_verification_sent: SecurityEventType.EMAIL_CHANGE,
      email_verified: SecurityEventType.EMAIL_CHANGE,
    };

    return typeMap[type] || SecurityEventType.SUSPICIOUS_ACTIVITY;
  }

  // Additional security methods
  async checkPasswordStrength(
    password: string,
  ): Promise<{ score: number; feedback: string[] }> {
    const validation = this.securityConfig.validatePassword(password);

    // Simple password strength scoring
    let score = 0;
    if (password.length >= 12) score += 2;
    else if (password.length >= 8) score += 1;

    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 2;

    return {
      score: Math.min(score, 5), // Scale to 5-point scale
      feedback: validation.errors,
    };
  }

  async getSecurityEvents(userId: string, limit: number = 50) {
    return this.securityLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getLoginHistory(userId: string, limit: number = 20) {
    return this.securityLogModel
      .find({
        userId,
        type: { $in: ['login_successful', 'login_failed'] },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // ============ UTILITY METHODS ============

  private getDeviceType(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();
    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'Mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'Tablet';
    }
    return 'Desktop';
  }

  private getBrowser(userAgent?: string): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown';
  }

  private convertJwtExpiresIn(expiresIn: string): number {
    // If it's already a number string, convert to number
    if (/^\d+$/.test(expiresIn)) {
      return parseInt(expiresIn, 10);
    }

    // Handle common string formats
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];

      switch (unit) {
        case 's':
          return value; // seconds
        case 'm':
          return value * 60; // minutes to seconds
        case 'h':
          return value * 3600; // hours to seconds
        case 'd':
          return value * 86400; // days to seconds
      }
    }

    // Default to 7 days in seconds if format is unrecognized
    return 604800;
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = this.jwtService.verify(resetPasswordDto.token);
      const user = await this.usersService.findById(payload.sub);

      if (!user || user.passwordResetToken !== resetPasswordDto.token) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 12);
      await this.usersService.resetPassword(user.id, hashedPassword);

      return { message: 'Password reset successful' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.usersService.findById(userId);

      const { password, refreshToken, passwordResetToken, _id, ...rest } =
        user.toObject();
      return { id: _id?.toString?.() ?? String(_id), ...rest };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('User not found');
      }
      throw error;
    }
  }

  async getAdminStats() {
    // This would typically aggregate data from multiple services
    const totalUsers = await this.usersService.count();
    const totalCourses = 0; // Would come from courses service
    const totalRevenue = 0; // Would come from payments service
    const recentOrders = []; // Would come from orders service

    return {
      totalUsers,
      totalCourses,
      totalRevenue,
      recentOrders,
      chartData: {
        // Mock data - would be real analytics
        revenue: [1200, 1900, 3000, 5000, 2000, 3000],
        users: [100, 200, 150, 300, 200, 400],
      },
    };
  }
}
