import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Only import essential core modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { CourseCategoriesModule } from './course-categories/course-categories.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { UploadsModule } from './uploads/uploads.module';
import { HealthModule } from './health/health.module';

// Security Module (MUST BE FIRST)
import { SecurityModule } from './shared/security.module';
import { SystemConfigModule } from './system-config/system-config.module';

/**
 * Fast-loading minimal app module for development
 * Only includes essential modules for quick startup
 * Use AppModule for full feature set
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true, // Enable caching
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
    }),

    // Optimized Database Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        dbName: configService.get<string>('DB_NAME'),
        // Performance optimizations
        maxPoolSize: configService.get<number>('MONGODB_MAX_POOL_SIZE', 20),
        minPoolSize: configService.get<number>('MONGODB_MIN_POOL_SIZE', 2),
        socketTimeoutMS: configService.get<number>(
          'MONGODB_SOCKET_TIMEOUT',
          45000,
        ),
        connectTimeoutMS: configService.get<number>(
          'MONGODB_CONNECT_TIMEOUT',
          10000,
        ),
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        compressors: ['zlib'], // Enable compression
        // Read preference for better performance
        readPreference: 'secondaryPreferred',
      }),
      inject: [ConfigService],
    }),

    // Minimal rate limiting
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

    // Disable scheduling in fast mode
    // ScheduleModule.forRoot(),

    // Security Module (MUST BE FIRST)
    SecurityModule,

    // Essential feature modules only
    AuthModule,
    UsersModule,
    CoursesModule,
    CourseCategoriesModule,
    EnrollmentsModule,
    UploadsModule,
    HealthModule,
    SystemConfigModule,
  ],
  providers: [],
})
export class AppFastModule {}
