import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { ErrorSeverity } from '../../activity-logs/entities/error-log.entity';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    private configService: ConfigService,
    private activityLogsService: ActivityLogsService | null,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let validationErrors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        if (
          (exceptionResponse as any).message &&
          Array.isArray((exceptionResponse as any).message)
        ) {
          validationErrors = (exceptionResponse as any).message;
        }
      } else {
        message = exceptionResponse;
      }
    }

    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    if (validationErrors) {
      errorResponse.validationErrors = validationErrors;
    }

    // Log error to database (skip for activity-logs endpoints to prevent recursion)
    if (!request.url.includes('/activity-logs') && this.activityLogsService) {
      try {
        await this.activityLogsService.createErrorLog({
          severity: this.getSeverityFromStatus(status),
          errorType:
            exception instanceof Error
              ? exception.constructor.name
              : 'UnknownError',
          message: message,
          stack: exception instanceof Error ? exception.stack : undefined,
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          userId: (request as any).user?.id || (request as any).user?._id,
          ipAddress: request.ip || request.socket.remoteAddress,
          userAgent: request.headers['user-agent'],
          isResolved: false,
        });
      } catch (logError) {
        // Don't fail the request if logging fails
        this.logger.error('Failed to log error to database:', logError);
      }
    }

    // Log error in development
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.error(
        `HTTP Status: ${status} Error Message: ${message}`,
        exception instanceof Error ? exception.stack : 'No stack trace',
      );
    }

    response.status(status).json(errorResponse);
  }

  private getSeverityFromStatus(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.CRITICAL;
    if (status >= 400) return ErrorSeverity.HIGH;
    return ErrorSeverity.MEDIUM;
  }
}
