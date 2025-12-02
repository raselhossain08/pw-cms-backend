import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
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

    // Log error in development
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logger.error(
        `HTTP Status: ${status} Error Message: ${message}`,
        exception instanceof Error ? exception.stack : 'No stack trace',
      );
    }

    response.status(status).json(errorResponse);
  }
}
