import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log security-related errors
    if (this.isSecurityError(status)) {
      console.error('[SECURITY EVENT]', {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        status,
        message,
      });
    }

    // Send generic error message for security reasons
    if (this.isSecurityError(status)) {
      response.status(status).json({
        statusCode: status,
        message: 'Access denied',
        timestamp: new Date().toISOString(),
      });
    } else {
      response.status(status).json({
        statusCode: status,
        message:
          typeof message === 'string' ? message : (message as any).message,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  private isSecurityError(status: number): boolean {
    return [
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.TOO_MANY_REQUESTS,
    ].includes(status);
  }
}
