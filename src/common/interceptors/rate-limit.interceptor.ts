import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SecurityConfigService } from '../../config/security.config';

interface RateLimitData {
  count: number;
  timestamp: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly rateLimitStore = new Map<string, RateLimitData>();

  constructor(private securityConfig: SecurityConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Skip rate limiting for SSE endpoints to avoid header conflicts
    if (request.url.includes('/sse') || request.path.includes('/sse')) {
      return next.handle();
    }

    const clientId = this.getClientIdentifier(request);

    this.cleanupOldEntries();

    const currentTime = Date.now();
    const windowMs = this.securityConfig.throttleTtl * 1000;
    const limit = this.securityConfig.throttleLimit;

    const clientData = this.rateLimitStore.get(clientId) || {
      count: 0,
      timestamp: currentTime,
    };

    // Reset counter if window has passed
    if (currentTime - clientData.timestamp > windowMs) {
      clientData.count = 0;
      clientData.timestamp = currentTime;
    }

    // Check if rate limit exceeded
    if (clientData.count >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(
            (clientData.timestamp + windowMs - currentTime) / 1000,
          ),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    clientData.count++;
    this.rateLimitStore.set(clientId, clientData);

    // Add rate limit headers to response
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-RateLimit-Limit', limit);
        response.setHeader(
          'X-RateLimit-Remaining',
          Math.max(0, limit - clientData.count),
        );
        response.setHeader(
          'X-RateLimit-Reset',
          Math.ceil((clientData.timestamp + windowMs) / 1000),
        );
      }),
    );
  }

  private getClientIdentifier(request: any): string {
    // Use IP address as primary identifier
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    // For authenticated users, include user ID for more granular control
    const userId = request.user?.id || 'anonymous';

    // For API endpoints, include the endpoint path
    const path = request.route?.path || request.url;

    return `${ip}:${userId}:${path}`;
  }

  private cleanupOldEntries(): void {
    const currentTime = Date.now();
    const windowMs = this.securityConfig.throttleTtl * 1000;

    for (const [key, data] of this.rateLimitStore.entries()) {
      if (currentTime - data.timestamp > windowMs * 2) {
        // Remove entries older than 2 windows
        this.rateLimitStore.delete(key);
      }
    }
  }

  // Method to manually reset rate limits (useful for testing)
  resetRateLimit(clientId?: string): void {
    if (clientId) {
      this.rateLimitStore.delete(clientId);
    } else {
      this.rateLimitStore.clear();
    }
  }

  // Method to get current rate limit stats
  getRateLimitStats(): Map<string, RateLimitData> {
    return new Map(this.rateLimitStore);
  }
}
