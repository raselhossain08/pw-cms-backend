import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '../config/config.module';

// Import entities
import { UserSession, UserSessionSchema } from './entities/user-session.entity';
import {
  EmailVerification,
  EmailVerificationSchema,
} from './entities/email-verification.entity';
import {
  PasswordReset,
  PasswordResetSchema,
} from './entities/password-reset.entity';
import {
  LoginAttempt,
  LoginAttemptSchema,
} from './entities/login-attempt.entity';
import { SecurityLog, SecurityLogSchema } from './entities/security-log.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: UserSession.name, schema: UserSessionSchema },
      { name: EmailVerification.name, schema: EmailVerificationSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
      { name: SecurityLog.name, schema: SecurityLogSchema },
    ]),
    forwardRef(() => UsersModule),
    NotificationsModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy, WsJwtGuard],
  exports: [AuthService, SessionService, JwtModule, WsJwtGuard],
})
export class AuthModule {}
