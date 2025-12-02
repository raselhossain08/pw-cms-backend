import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const user = request.user?.id || 'anonymous';

    const now = Date.now();
    // Minimal logging to reduce overhead in production
    this.logger.log(`Incoming Request: ${method} ${url} - User: ${user}`);

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        this.logger.log(
          `Response: ${method} ${url} - User: ${user} - ${responseTime}ms`,
        );
      }),
    );
  }
}
