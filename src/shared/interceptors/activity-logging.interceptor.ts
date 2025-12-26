import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import {
  LogLevel,
  LogCategory,
} from '../../activity-logs/entities/activity-log.entity';
import { ErrorSeverity } from '../../activity-logs/entities/error-log.entity';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(private activityLogsService: ActivityLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, query, ip, headers } = request;
    const startTime = Date.now();

    // Skip logging for health checks, static assets, and activity-logs endpoints to prevent recursion
    if (
      url.includes('/health') ||
      url.includes('/api-docs') ||
      url.includes('/static') ||
      url.includes('/activity-logs') ||
      url.includes('/swagger')
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;
        const responseObj = context.switchToHttp().getResponse();
        const statusCode = responseObj.statusCode;

        // Log successful requests (2xx, 3xx)
        if (statusCode < 400) {
          await this.activityLogsService
            .createActivityLog({
              level: LogLevel.INFO,
              category: this.getCategoryFromUrl(url),
              title: `${method} ${url}`,
              message: `Request completed successfully`,
              userId: user?.id || user?._id,
              userName: user?.firstName
                ? `${user.firstName} ${user.lastName}`
                : undefined,
              userEmail: user?.email,
              ipAddress: ip || request.socket.remoteAddress,
              userAgent: headers['user-agent'],
              endpoint: url,
              method: method,
              statusCode: statusCode,
              duration: duration,
              requestData: this.sanitizeData(body),
              responseData: this.sanitizeData(response),
            })
            .catch((err) => console.error('Failed to log activity:', err));
        }
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || error.statusCode || 500;

        // Log errors
        await this.activityLogsService
          .createErrorLog({
            severity: this.getSeverityFromStatus(statusCode),
            errorType: error.constructor?.name || 'Error',
            message: error.message || 'Unknown error',
            stack: error.stack,
            endpoint: url,
            method: method,
            statusCode: statusCode,
            userId: user?.id || user?._id,
            ipAddress: ip || request.socket.remoteAddress,
            userAgent: headers['user-agent'],
            isResolved: false,
          })
          .catch((err) => console.error('Failed to log error:', err));

        throw error;
      }),
    );
  }

  private getCategoryFromUrl(url: string): LogCategory {
    if (url.includes('/auth')) return LogCategory.SECURITY;
    if (url.includes('/users')) return LogCategory.USER;
    if (url.includes('/courses')) return LogCategory.COURSE;
    if (url.includes('/payments')) return LogCategory.PAYMENT;
    if (url.includes('/admin')) return LogCategory.ADMIN;
    if (url.includes('/ai-bot')) return LogCategory.AI;
    if (url.includes('/chat')) return LogCategory.CHAT;
    return LogCategory.SYSTEM;
  }

  private getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status >= 400) return ErrorSeverity.HIGH;
    return ErrorSeverity.MEDIUM;
  }

  private sanitizeData(data: any): any {
    if (!data) return null;
    if (typeof data !== 'object') return data;

    const sensitive = [
      'password',
      'token',
      'secret',
      'key',
      'creditCard',
      'cvv',
      'pin',
      'ssn',
      'apiKey',
      'accessToken',
      'refreshToken',
      'authorization',
      'authToken',
    ];

    const sanitize = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(sanitize);

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitive.some((s) => lowerKey.includes(s));

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    try {
      // Limit response data size to prevent huge logs
      const sanitized = sanitize(data);
      const jsonString = JSON.stringify(sanitized);
      if (jsonString.length > 10000) {
        return { truncated: true, size: jsonString.length };
      }
      return sanitized;
    } catch (error) {
      return { error: 'Failed to sanitize data' };
    }
  }
}
