import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';

// Core Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { CourseCategoriesModule } from './course-categories/course-categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';
import { ChatModule } from './chat/chat.module';

// LMS Feature Modules
import { ReviewsModule } from './reviews/reviews.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { LiveSessionsModule } from './live-sessions/live-sessions.module';
import { GamificationModule } from './gamification/gamification.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CouponsModule } from './coupons/coupons.module';
import { CertificatesModule } from './certificates/certificates.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { AssignmentsModule } from './assignments/assignments.module';

// Admin & Analytics Modules
import { AdminModule } from './admin/admin.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PageTrackingModule } from './page-tracking/page-tracking.module';

// Customer Service Modules
import { RefundsModule } from './refunds/refunds.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SupportModule } from './support/support.module';
import { AiBotModule } from './ai-bot/ai-bot.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { CmsModule } from './cms/cms.module';

// Security Module
import { SecurityModule } from './shared/security.module';
import { ApiExtensionsModule } from './shared/api-extensions.module';

// Entities for Tasks
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
} from './analytics/entities/analytics.entity';

// Tasks
import { EmailTasksService } from './tasks/email-tasks.service';
import { AnalyticsTasksService } from './tasks/analytics-tasks.service';

// Gateways
import { NotificationsGateway } from './notifications/gateways/notifications.gateway';
import { ChatGateway } from './chat/gateways/chat.gateway';
import { AiBotGateway } from './ai-bot/ai-bot.gateway';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('DB_NAME'),
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60),
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
      inject: [ConfigService],
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Register models needed by task services
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),

    // Email
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('SMTP_HOST');
        const port = Number(configService.get<string>('SMTP_PORT')) || 2525;
        const user =
          configService.get<string>('SMTP_USER') ||
          configService.get<string>('MAILTRAP_USERNAME');
        const pass =
          configService.get<string>('SMTP_PASS') ||
          configService.get<string>('MAILTRAP_PASSWORD');

        return {
          transport: {
            service: host?.includes('gmail') ? 'gmail' : undefined,
            host,
            port,
            secure: false,
            requireTLS: true,
            auth: user && pass ? { user, pass } : undefined,
            tls: { rejectUnauthorized: false },
          },
          defaults: {
            from: `"${configService.get('FROM_NAME')}" <${configService.get('FROM_EMAIL')}>`,
          },
          template: {
            dir: path.resolve(process.cwd(), 'src', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),

    // Security Module (MUST BE FIRST)
    SecurityModule,

    // API Extensions (Bulk, Reports, Progress, Instructor Dashboard)
    ApiExtensionsModule,

    // Feature modules
    AuthModule,
    UsersModule,
    CoursesModule,
    CourseCategoriesModule,
    ProductsModule,
    NotificationsModule,
    UploadsModule,
    OrdersModule,
    PaymentsModule,
    AnalyticsModule,
    HealthModule,
    ChatModule,

    // LMS Feature Modules
    ReviewsModule,
    EnrollmentsModule,
    QuizzesModule,
    LiveSessionsModule,
    GamificationModule,
    WishlistModule,
    CouponsModule,
    CertificatesModule,
    DiscussionsModule,
    AssignmentsModule,

    // Admin & Analytics Modules
    AdminModule,
    CampaignsModule,
    PageTrackingModule,

    // Customer Service Modules
    RefundsModule,
    AttendanceModule,
    SupportModule,
    AiBotModule,
    SystemConfigModule,

    // CMS Module (Header, Footer, etc.)
    CmsModule,
  ],
  providers: [
    // Background tasks
    EmailTasksService,
    AnalyticsTasksService,

    // WebSocket gateways
    NotificationsGateway,
    ChatGateway,
    AiBotGateway,
  ],
})
export class AppModule {}
