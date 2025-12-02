import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../notifications/mail.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailVerification } from './entities/email-verification.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerification>,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const verificationToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '24h' },
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

    const { password, ...result } = user.toObject();
    return {
      user: result,
      message:
        'Registration successful. Please check your email for verification.',
      activationLink,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.generateTokens(user);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

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
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    // Store refresh token in user record (in production, use Redis)
    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
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

  async resendVerification(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new BadRequestException('Invalid token');

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await this.emailVerificationModel.create({
        user: user.id,
        token: code,
        email: user.email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        type: 'otp',
      });
      await this.mailService.sendVerificationEmail(user.email, token, code);
      return { message: 'Verification email resent' };
    } catch (e) {
      throw new BadRequestException('Invalid or expired token');
    }
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
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, refreshToken, passwordResetToken, _id, ...rest } =
      user.toObject();
    return { id: _id?.toString?.() ?? String(_id), ...rest };
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
