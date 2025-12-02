import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BruteForceGuard } from './guards/brute-force.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { SanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { SecurityExceptionFilter } from './filters/security-exception.filter';
import { SecurityController } from './controllers/security.controller';
import { SystemConfigModule } from '../system-config/system-config.module';

@Global()
@Module({
  imports: [
    SystemConfigModule,
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutes
        limit: 500, // 500 requests per 15 minutes
      },
    ]),
  ],
  controllers: [SecurityController],
  providers: [
    // Standalone providers (for manual injection)
    BruteForceGuard,
    CsrfGuard,
    SanitizeInterceptor,
    SecurityExceptionFilter,
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Data sanitization
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
    // Security exception handling
    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter,
    },
  ],
  exports: [BruteForceGuard, CsrfGuard],
})
export class SecurityModule {}
