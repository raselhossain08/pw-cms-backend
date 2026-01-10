import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    timestamp: string;
    path: string;
    method: string;
  };
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    return next.handle().pipe(
      map((data) => {
        // Clean empty date objects from the response
        const cleanedData = this.cleanEmptyObjects(data, new WeakSet());

        return {
          success: true,
          message: 'Request successful',
          data: cleanedData,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
          },
        };
      }),
    );
  }

  private cleanEmptyObjects(obj: any, visited: WeakSet<object> = new WeakSet()): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle primitive types
    if (typeof obj !== 'object') {
      return obj;
    }

    // Prevent circular references
    if (visited.has(obj)) {
      return obj;
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return obj;
    }

    // Handle Arrays
    if (Array.isArray(obj)) {
      visited.add(obj);
      return obj.map((item) => this.cleanEmptyObjects(item, visited));
    }

    // Handle plain objects
    visited.add(obj);
    const cleaned: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        // Check if value is an empty object (like empty BSON dates)
        if (
          value &&
          typeof value === 'object' &&
          !(value instanceof Date) &&
          !Array.isArray(value) &&
          Object.keys(value).length === 0
        ) {
          // Skip empty objects
          continue;
        }

        // Recursively clean nested objects
        cleaned[key] = this.cleanEmptyObjects(value, visited);
      }
    }

    return cleaned;
  }
}
