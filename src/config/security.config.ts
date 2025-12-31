import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityConfigService {
  constructor(private configService: ConfigService) {}

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.get<string>(
      'JWT_SECRET',
      'fallback-secret-change-in-production',
    );
  }

  get jwtExpiresIn(): string {
    return this.configService.get<string>('JWT_EXPIRES_IN', '7d');
  }

  // Rate Limiting Configuration
  get throttleTtl(): number {
    return this.configService.get<number>('THROTTLE_TTL', 60);
  }

  get throttleLimit(): number {
    return this.configService.get<number>('THROTTLE_LIMIT', 100);
  }

  // Session Configuration
  get sessionSecret(): string {
    return this.configService.get<string>(
      'SESSION_SECRET',
      'fallback-session-secret-change-this',
    );
  }

  get sessionTimeout(): number {
    return this.configService.get<number>('SESSION_TIMEOUT', 3600); // 1 hour in seconds
  }

  // Security Headers Configuration
  get securityHeaders(): {
    hstsMaxAge: number;
    xFrameOptions: string;
    xContentTypeOptions: string;
    xXssProtection: string;
    referrerPolicy: string;
    contentSecurityPolicy: string;
  } {
    return {
      hstsMaxAge: this.configService.get<number>('HSTS_MAX_AGE', 31536000), // 1 year
      xFrameOptions: this.configService.get<string>('X_FRAME_OPTIONS', 'DENY'),
      xContentTypeOptions: this.configService.get<string>(
        'X_CONTENT_TYPE_OPTIONS',
        'nosniff',
      ),
      xXssProtection: this.configService.get<string>(
        'X_XSS_PROTECTION',
        '1; mode=block',
      ),
      referrerPolicy: this.configService.get<string>(
        'REFERRER_POLICY',
        'strict-origin-when-cross-origin',
      ),
      contentSecurityPolicy: this.configService.get<string>(
        'CONTENT_SECURITY_POLICY',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
      ),
    };
  }

  // Password Policy Configuration
  get passwordPolicy(): {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAgeDays: number;
  } {
    return {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', 8),
      requireUppercase: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_UPPERCASE',
        true,
      ),
      requireLowercase: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_LOWERCASE',
        true,
      ),
      requireNumbers: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_NUMBERS',
        true,
      ),
      requireSpecialChars: this.configService.get<boolean>(
        'PASSWORD_REQUIRE_SPECIAL_CHARS',
        true,
      ),
      maxAgeDays: this.configService.get<number>('PASSWORD_MAX_AGE_DAYS', 90),
    };
  }

  // Two-Factor Authentication Configuration
  get twoFactorConfig(): {
    enabled: boolean;
    issuer: string;
    window: number;
  } {
    return {
      enabled: this.configService.get<boolean>('TWO_FACTOR_ENABLED', false),
      issuer: this.configService.get<string>(
        'TWO_FACTOR_ISSUER',
        'Personal Wings',
      ),
      window: this.configService.get<number>('TWO_FACTOR_WINDOW', 1),
    };
  }

  // API Security Configuration
  get apiSecurity(): {
    rateLimitEnabled: boolean;
    corsOrigins: string[];
    corsCredentials: boolean;
    apiKeyHeader: string;
  } {
    return {
      rateLimitEnabled: this.configService.get<boolean>(
        'RATE_LIMIT_ENABLED',
        true,
      ),
      corsOrigins: this.configService
        .get<string>('CORS_ORIGIN', 'http://localhost:3000')
        .split(','),
      corsCredentials: this.configService.get<boolean>(
        'CORS_CREDENTIALS',
        true,
      ),
      apiKeyHeader: this.configService.get<string>(
        'API_KEY_HEADER',
        'X-API-Key',
      ),
    };
  }

  // Environment-specific security settings
  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  get isTest(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'test';
  }

  // Security validation methods
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const policy = this.passwordPolicy;
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(
        `Password must be at least ${policy.minLength} characters long`,
      );
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (
      policy.requireSpecialChars &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateSecurityHeaders(): Record<string, string> {
    const headers = this.securityHeaders;
    return {
      'Strict-Transport-Security': `max-age=${headers.hstsMaxAge}; includeSubDomains`,
      'X-Frame-Options': headers.xFrameOptions,
      'X-Content-Type-Options': headers.xContentTypeOptions,
      'X-XSS-Protection': headers.xXssProtection,
      'Referrer-Policy': headers.referrerPolicy,
      'Content-Security-Policy': headers.contentSecurityPolicy,
    };
  }
}
