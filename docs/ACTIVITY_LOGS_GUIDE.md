# Activity Logs & Monitoring System Guide

## Overview

The Activity Logs system is a comprehensive logging solution that tracks:

- **Activity Logs**: User actions, API calls, system events
- **Error Logs**: Application errors, exceptions, failures
- **AI Logs**: AI bot interactions, prompts, responses
- **Chat Logs**: User-to-user and support chat messages
- **System Logs**: System health, metrics, infrastructure events

## Current Status

### ✅ What's Already Built

1. **Database Models**: All log entities are defined (ActivityLog, ErrorLog, AiLog, ChatLog, SystemLog)
2. **Service Methods**: `ActivityLogsService` has methods to create and query logs
3. **API Endpoints**: Full CRUD operations for viewing, filtering, exporting logs
4. **Dashboard UI**: Complete interface for viewing and managing logs

### ⚠️ What's Missing (Needs Implementation)

The logging methods exist but are **not automatically called** from other services. You need to integrate logging into your application.

## Quick Start (5 Minutes)

To get basic logging working immediately:

1. **Create the interceptor** (copy code from "Complete File Implementations" section)
2. **Register in `main.ts`** (copy code from "Register in main.ts" section)
3. **Update `GlobalExceptionFilter`** (copy code from "Error Logging Integration" section)
4. **Test**: Make any API request and check the dashboard

That's it! You'll immediately start seeing logs in the dashboard.

## How New Data Gets Created

### Option 1: Manual Logging (Current Approach)

Services manually call `ActivityLogsService` methods:

```typescript
// Example: In any service
constructor(
  private activityLogsService: ActivityLogsService,
) {}

async someUserAction(userId: string, data: any) {
  // Your business logic
  const result = await this.doSomething();

  // Log the activity
  await this.activityLogsService.createActivityLog({
    level: LogLevel.INFO,
    category: LogCategory.USER,
    title: 'User performed action',
    message: `User ${userId} performed action`,
    userId: userId,
    endpoint: '/api/some-endpoint',
    method: 'POST',
  });

  return result;
}
```

### Option 2: Automatic Logging via Interceptor (Recommended)

Create an interceptor that automatically logs all HTTP requests:

**Create: `backend/src/shared/interceptors/activity-logging.interceptor.ts`**

```typescript
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

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;

        // Log successful requests
        if (statusCode < 400) {
          await this.activityLogsService
            .createActivityLog({
              level: LogLevel.INFO,
              category: this.getCategoryFromUrl(url),
              title: `${method} ${url}`,
              message: `Request completed successfully`,
              userId: user?.id,
              userName: user?.firstName + ' ' + user?.lastName,
              userEmail: user?.email,
              ipAddress: ip,
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
        const statusCode = error.status || 500;

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
            userId: user?.id,
            ipAddress: ip,
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
      return sanitize(data);
    } catch (error) {
      return { error: 'Failed to sanitize data' };
    }
  }
}
```

**Register in `main.ts`:**

```typescript
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ActivityLogsService } from './activity-logs/activity-logs.service';
import { ActivityLoggingInterceptor } from './shared/interceptors/activity-logging.interceptor';

// In bootstrap function, after app creation:
const activityLogsService = app.get(ActivityLogsService);

app.useGlobalInterceptors(
  new LoggingInterceptor(),
  new ActivityLoggingInterceptor(activityLogsService), // Add this
  new ResponseInterceptor(),
);
```

**Important:** Make sure `ActivityLogsModule` is imported in `app.module.ts`:

```typescript
// app.module.ts
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

@Module({
  imports: [
    // ... other imports
    ActivityLogsModule, // Make sure this is imported
  ],
})
export class AppModule {}
```

### Option 3: Service-Specific Logging

#### AI Bot Logging

**Update: `backend/src/ai-bot/ai-bot.service.ts`**

```typescript
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { AiModel } from '../activity-logs/entities/ai-log.entity';

@Injectable()
export class AiBotService {
  constructor(
    // ... existing dependencies
    private activityLogsService: ActivityLogsService, // Add this
  ) {}

  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const startTime = Date.now();
    const { message, sessionId } = sendMessageDto;

    try {
      // ... existing logic to generate response
      const response = await this.generateResponse(
        intent,
        message,
        conversation,
        userId,
      );
      const duration = Date.now() - startTime;

      // Get user info for logging
      const user = await this.getUserById(userId).catch(() => null);

      // Log successful AI interaction
      await this.activityLogsService
        .createAiLog({
          aiModel: AiModel.GPT4, // Or determine from your config
          prompt: message,
          response: response.message || JSON.stringify(response),
          tokensUsed: response.tokensUsed || 0,
          responseTime: duration,
          userId: userId,
          userName: user ? `${user.firstName} ${user.lastName}` : undefined,
          conversationId: sessionId,
          status: 'success',
        })
        .catch((err) => console.error('Failed to log AI interaction:', err));

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log failed AI interaction
      await this.activityLogsService
        .createAiLog({
          aiModel: AiModel.GPT4,
          prompt: message,
          response: '',
          tokensUsed: 0,
          responseTime: duration,
          userId: userId,
          conversationId: sessionId,
          status: 'error',
          errorMessage: error.message || 'Unknown error',
        })
        .catch((err) => console.error('Failed to log AI error:', err));

      throw error;
    }
  }

  // Helper method if you need to get user
  private async getUserById(userId: string) {
    // Implement based on your user service
    return null;
  }
}
```

**Update `ai-bot.module.ts`:**

```typescript
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    // ... existing imports
    ActivityLogsModule, // Add this
  ],
  // ...
})
export class AiBotModule {}
```

#### Chat Logging

**Update: `backend/src/chat/chat.service.ts`**

```typescript
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ChatType } from '../activity-logs/entities/chat-log.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(User.name) private userModel: Model<User>, // If needed
    private activityLogsService: ActivityLogsService, // Add this
  ) {}

  async sendMessage(
    conversationId: string,
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    // ... existing validation logic

    const message = new this.messageModel({
      ...createMessageDto,
      conversation: conversationId,
      sender: userId,
    });
    const savedMessage = await message.save();

    // Get conversation to determine chat type
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'firstName lastName')
      .exec();

    // Get sender info
    const sender = await this.userModel.findById(userId).exec();
    const senderName = sender
      ? `${sender.firstName} ${sender.lastName}`
      : 'Unknown';

    // Determine chat type
    let chatType = ChatType.USER_TO_USER;
    if (conversation?.type) {
      chatType = conversation.type as ChatType;
    } else if (conversation?.participants?.length === 2) {
      chatType = ChatType.USER_TO_USER;
    } else if (conversation?.participants?.length > 2) {
      chatType = ChatType.GROUP_CHAT;
    }

    // Log chat message
    await this.activityLogsService
      .createChatLog({
        chatType: chatType,
        senderId: userId,
        senderName: senderName,
        receiverId: conversation?.participants
          ?.find((p: any) => p._id.toString() !== userId)
          ?._id?.toString(),
        receiverName:
          conversation?.participants?.find(
            (p: any) => p._id.toString() !== userId,
          )?.firstName +
          ' ' +
          conversation?.participants?.find(
            (p: any) => p._id.toString() !== userId,
          )?.lastName,
        conversationId: conversationId,
        message: createMessageDto.content || createMessageDto.message || '',
        isRead: false,
      })
      .catch((err) => console.error('Failed to log chat message:', err));

    // Update conversation's last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: savedMessage._id,
    });

    return savedMessage;
  }
}
```

**Update `chat.module.ts`:**

```typescript
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    // ... existing imports
    ActivityLogsModule, // Add this
  ],
  // ...
})
export class ChatModule {}
```

#### System Health Logging

**Create: `backend/src/shared/services/system-health-monitor.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import {
  SystemEventType,
  SystemStatus,
} from '../../activity-logs/entities/system-log.entity';
import * as os from 'os';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class SystemHealthMonitor {
  private readonly logger = new Logger(SystemHealthMonitor.name);
  private previousCpuUsage = 0;

  constructor(
    private activityLogsService: ActivityLogsService,
    @InjectConnection() private connection: Connection,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSystemHealth() {
    try {
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const activeConnections = this.connection.readyState === 1 ? 1 : 0;

      const status = this.determineStatus(cpuUsage, memoryUsage, diskUsage);

      await this.activityLogsService
        .createSystemLog({
          eventType: SystemEventType.API_HEALTH_CHECK,
          status: status,
          message: `System health check: CPU ${cpuUsage}%, Memory ${memoryUsage}%, Disk ${diskUsage}%`,
          systemMetrics: {
            cpuUsage,
            memoryUsage,
            diskUsage,
            activeConnections,
          },
          requiresAction: status !== SystemStatus.HEALTHY,
        })
        .catch((err) => {
          this.logger.error('Failed to log system health:', err);
        });
    } catch (error) {
      this.logger.error('System health check failed:', error);
    }
  }

  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      if (!cpus || cpus.length === 0) {
        resolve(0);
        return;
      }

      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach((cpu) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = Math.round(100 - (idle / total) * 100);
      resolve(Math.max(0, Math.min(100, usage))); // Clamp between 0-100
    });
  }

  private getMemoryUsage(): number {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      return Math.round((used / total) * 100);
    } catch (error) {
      this.logger.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  private async getDiskUsage(): Promise<number> {
    try {
      // Simple implementation using process.cwd()
      // For production, consider using 'node-disk-info' package
      const fs = require('fs').promises;
      const stats = await fs.statfs(process.cwd()).catch(() => null);

      if (stats) {
        const total = stats.blocks * stats.bsize;
        const available = stats.bavail * stats.bsize;
        const used = total - available;
        return Math.round((used / total) * 100);
      }

      // Fallback: Try to use node-disk-info if installed
      try {
        const diskInfo = require('node-disk-info');
        const disks = await diskInfo.getDiskInfo();
        const rootDisk = disks.find((d: any) => d.mounted === '/') || disks[0];
        if (rootDisk && rootDisk.available && rootDisk.used) {
          const total = rootDisk.available + rootDisk.used;
          return Math.round((rootDisk.used / total) * 100);
        }
      } catch {
        // node-disk-info not installed, use fallback
      }

      return 0; // Return 0 if unable to determine
    } catch (error) {
      this.logger.error('Failed to get disk usage:', error);
      return 0;
    }
  }

  private determineStatus(
    cpu: number,
    memory: number,
    disk: number,
  ): SystemStatus {
    if (cpu > 90 || memory > 90 || disk > 90) return SystemStatus.CRITICAL;
    if (cpu > 70 || memory > 70 || disk > 70) return SystemStatus.WARNING;
    return SystemStatus.HEALTHY;
  }
}
```

**Register in a module (e.g., `app.module.ts` or create a dedicated module):**

```typescript
import { SystemHealthMonitor } from './shared/services/system-health-monitor.service';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Required for cron jobs
    ActivityLogsModule, // Required for logging
    // ... other imports
  ],
  providers: [
    SystemHealthMonitor, // Add this
    // ... other providers
  ],
})
export class AppModule {}
```

## Integration Steps

### Step 1: Import ActivityLogsModule

In any module that needs logging:

```typescript
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [
    ActivityLogsModule, // Add this
    // ... other imports
  ],
  // ...
})
```

### Step 2: Inject ActivityLogsService

```typescript
constructor(
  private activityLogsService: ActivityLogsService,
) {}
```

### Step 3: Call Logging Methods

Use the appropriate method based on what you're logging:

- `createActivityLog()` - General user/system activities
- `createErrorLog()` - Errors and exceptions
- `createAiLog()` - AI interactions
- `createChatLog()` - Chat messages
- `createSystemLog()` - System health/metrics

## Data Flow

```
┌─────────────────┐
│  User Action    │
│  API Request    │
│  System Event   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service/       │
│  Interceptor    │
│  (Business      │
│   Logic)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ActivityLogs    │
│ Service         │
│ create*Log()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB        │
│  (Logs          │
│   Collection)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dashboard UI   │
│  (View/Filter/  │
│   Export)       │
└─────────────────┘
```

## Best Practices

1. **Don't Log Sensitive Data**: Sanitize passwords, tokens, credit cards
2. **Use Appropriate Log Levels**: INFO for normal, ERROR for problems
3. **Async Logging**: Use `.catch()` to prevent logging failures from breaking your app
4. **Performance**: Consider batching logs or using a queue for high-volume scenarios
5. **Retention**: Implement log cleanup/archival for old logs

## Example: Complete Integration

```typescript
// users.service.ts
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import {
  LogLevel,
  LogCategory,
} from '../activity-logs/entities/activity-log.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private activityLogsService: ActivityLogsService, // Add this
  ) {}

  async updateProfile(userId: string, updateData: any) {
    const user = await this.userModel.findByIdAndUpdate(userId, updateData);

    // Log the activity
    await this.activityLogsService
      .createActivityLog({
        level: LogLevel.INFO,
        category: LogCategory.USER,
        title: 'Profile Updated',
        message: `User ${userId} updated their profile`,
        userId: userId,
        endpoint: '/users/me',
        method: 'PATCH',
      })
      .catch((err) => console.error('Logging failed:', err));

    return user;
  }
}
```

## Error Logging Integration

### Update Global Exception Filter

**Update: `backend/src/shared/filters/global-exception.filter.ts`**

```typescript
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
    @Inject(ActivityLogsService)
    private activityLogsService: ActivityLogsService,
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

    // Log error to database
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
        userId: (request as any).user?.id,
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        isResolved: false,
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log error to database:', logError);
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
```

**Update `app.module.ts` to provide ActivityLogsService in GlobalExceptionFilter:**

```typescript
// In app.module.ts
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

@Module({
  imports: [
    // ... other imports
    ActivityLogsModule, // Required for error logging
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

## Required Package Dependencies

### Backend Dependencies

✅ **Already Installed:**

- `@nestjs/schedule` - For cron jobs (already in package.json)

**Optional (for better disk monitoring):**

```bash
cd backend
npm install node-disk-info
```

**Note:** `@nestjs/schedule` is already installed. If you want better disk usage monitoring, install `node-disk-info`.

### Frontend Dependencies

The frontend is already set up, but ensure these are installed:

```bash
cd dashboard
# These should already be installed:
# - date-fns (for date formatting)
# - lucide-react (for icons)
# - @radix-ui/react-* (for UI components)
```

## Frontend Setup & Requirements

### ✅ Already Implemented - No Setup Required!

The frontend Activity Logs dashboard is **fully implemented** and ready to use. No additional setup is needed!

1. **Activity Logs Page**: `dashboard/app/(dashboard)/(system)/activity-logs/page.tsx`
   - View all log types (Activity, Error, AI, Chat, System)
   - Filter by date, level, severity, status, etc.
   - Search functionality
   - Pagination
   - Export to JSON/CSV
   - Real-time auto-refresh
   - Log details modal
   - Bulk actions (delete, mark resolved)
   - Sort by columns

2. **Service Layer**: `dashboard/services/activity-logs.service.ts`
   - All API methods implemented
   - Error handling
   - Type-safe implementations

3. **Hook**: `dashboard/hooks/useActivityLogs.ts`
   - State management
   - Data fetching
   - Actions (delete, resolve, export)

4. **Types**: `dashboard/types/activity-logs.ts`
   - All TypeScript interfaces defined

### Frontend Configuration

**✅ No additional setup required!** The frontend is ready to use. Just ensure:

1. **API Base URL** is configured in `dashboard/lib/axios.ts` or your API client
   - Check that your API base URL points to the backend server
   - Default should be configured in your environment variables

2. **Authentication** is working (JWT tokens are sent with requests)
   - The dashboard uses `@/lib/axios` which should include auth headers automatically
   - Verify tokens are being sent in request headers

3. **User has admin/super_admin role** to access the logs page
   - The page is protected with `<RequireAuth roles={["admin", "super_admin"]}>`
   - Only users with these roles can access the logs

4. **Route Access**: Navigate to `/dashboard/system/activity-logs` in your dashboard app

### Frontend Features Available

- ✅ **Search Bar**: Real-time search across all log fields
- ✅ **Quick Date Filters**: Today, Week, Month buttons
- ✅ **Advanced Filters**: Modal with all filter options
- ✅ **Log Details Modal**: View full log information with copy functionality
- ✅ **Bulk Actions**: Select multiple logs and perform bulk operations
- ✅ **Export**: Download logs as JSON or CSV
- ✅ **Auto-Refresh**: Toggle automatic refresh every 30 seconds
- ✅ **Sort**: Click column headers to sort
- ✅ **Pagination**: Navigate through log pages
- ✅ **Error Resolution**: Mark errors as resolved with notes
- ✅ **Delete Logs**: Remove individual or bulk logs

## Complete File Implementations

### 1. Activity Logging Interceptor

**Create: `backend/src/shared/interceptors/activity-logging.interceptor.ts`**

```typescript
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

    // Skip logging for health checks and static assets
    if (
      url.includes('/health') ||
      url.includes('/api-docs') ||
      url.includes('/static')
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
```

### 2. System Health Monitor Service

**Create: `backend/src/shared/services/system-health-monitor.service.ts`**

(Already provided above in "System Health Logging" section)

### 3. Update Global Exception Filter

(Already provided above in "Error Logging Integration" section)

## Complete Implementation Checklist

### Backend Implementation

- [ ] **Step 1**: Create `activity-logging.interceptor.ts` (see complete code above)
- [ ] **Step 2**: Register interceptor in `main.ts` (see code above)
- [ ] **Step 3**: Update `GlobalExceptionFilter` to log errors (see code above)
- [ ] **Step 4**: Ensure `ActivityLogsModule` is imported in `app.module.ts` (already imported)
- [ ] **Step 5**: Add logging to AI Bot Service (`ai-bot.service.ts`) - see code above
- [ ] **Step 6**: Import `ActivityLogsModule` in `ai-bot.module.ts`
- [ ] **Step 7**: Add logging to Chat Service (`chat.service.ts`) - see code above
- [ ] **Step 8**: Import `ActivityLogsModule` in `chat.module.ts`
- [ ] **Step 9**: Create System Health Monitor service (see code above)
- [ ] **Step 10**: Register System Health Monitor in `app.module.ts` and ensure `ScheduleModule.forRoot()` is imported
- [ ] **Step 11**: Test logging by making API requests

### Frontend Implementation

- [x] ✅ Activity Logs page already implemented
- [x] ✅ Service layer already implemented
- [x] ✅ Hooks already implemented
- [x] ✅ Types already defined
- [x] ✅ UI components already built
- [ ] **Optional**: Add real-time WebSocket updates (future enhancement)

## Testing the Integration

### 1. Test Activity Logging

**After implementing the interceptor:**

```bash
# Make any API request
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or use the dashboard UI to navigate to any page
# Check dashboard: http://localhost:3001/dashboard/system/activity-logs
# Should see the request logged in "Activity Timeline" tab
```

**Expected Result:**

- Log appears in "Activity Timeline" tab
- Shows method, endpoint, user, duration, status code
- Click "View Details" to see full request/response data

### 2. Test Error Logging

**After implementing error logging in GlobalExceptionFilter:**

```bash
# Make a request that will fail
curl -X GET http://localhost:3000/api/invalid-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or trigger a validation error
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid"}' # Invalid email will trigger error

# Check dashboard: "Error Logs" tab
# Should see the error logged with severity and stack trace
```

**Expected Result:**

- Error appears in "Error Logs" tab
- Shows severity badge (LOW, MEDIUM, HIGH, CRITICAL)
- Shows error type, message, endpoint
- Click "View Details" to see full stack trace
- Can mark as resolved with solution notes

### 3. Test AI Logging

**After implementing AI logging in ai-bot.service.ts:**

```bash
# Send a message to AI bot
curl -X POST http://localhost:3000/api/ai-bot/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test-session"}'

# Check dashboard: "AI Logs" tab
# Should see the AI interaction logged
```

**Expected Result:**

- Log appears in "AI Logs" tab
- Shows AI model, prompt, response, tokens used, response time
- Shows user information
- Click "View Details" to see full conversation

### 4. Test Chat Logging

**After implementing chat logging in chat.service.ts:**

```bash
# Send a chat message
curl -X POST http://localhost:3000/api/chat/conversations/CONV_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello there!"}'

# Check dashboard: "Chat Logs" tab
# Should see the chat message logged
```

**Expected Result:**

- Log appears in "Chat Logs" tab
- Shows chat type, sender, receiver, message
- Shows read/unread status
- Can filter by conversation ID

### 5. Test System Logging

**After implementing SystemHealthMonitor:**

```bash
# Wait 5 minutes after starting the server
# System health monitor will run automatically via cron job

# Or manually trigger (if you expose an endpoint):
curl -X POST http://localhost:3000/api/admin/system-health-check \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check dashboard: "System Logs" tab
# Should see system health metrics logged
```

**Expected Result:**

- Log appears in "System Logs" tab every 5 minutes
- Shows CPU, Memory, Disk usage percentages
- Shows system status (HEALTHY, WARNING, ERROR, CRITICAL)
- Shows if action is required
- Click "View Details" to see full system metrics

## Troubleshooting

### Logs Not Appearing

1. **Check Module Imports**: Ensure `ActivityLogsModule` is imported in `app.module.ts`
2. **Check Interceptor Registration**: Verify interceptor is registered in `main.ts`
3. **Check Database Connection**: Ensure MongoDB is connected
4. **Check Permissions**: Verify user has admin/super_admin role
5. **Check Console**: Look for error messages in backend console

### Performance Issues

1. **Too Many Logs**: Consider filtering out health check endpoints
2. **Slow Queries**: Add database indexes on frequently queried fields
3. **Memory Usage**: Implement log cleanup/archival for old logs

### Common Errors

**Error: "ActivityLogsService is not defined"**

- Solution: Import `ActivityLogsModule` in the module where you're using it

**Error: "Cannot read property 'createActivityLog' of undefined"**

- Solution: Ensure `ActivityLogsService` is properly injected in constructor

**Error: "Circular dependency"**

- Solution: Use `forwardRef()` when importing modules with circular dependencies

## Next Steps

1. ✅ **Create the interceptor** (Option 2) for automatic HTTP request logging
2. ✅ **Add logging to AI bot service** for AI interactions
3. ✅ **Add logging to chat service** for chat messages
4. ✅ **Create system health monitor** for system metrics
5. ✅ **Add error logging** to exception filters
6. ✅ **Test the logging** by performing actions and checking the dashboard

Once integrated, all logs will automatically appear in the Activity Logs dashboard!

## Database Indexing (Performance Optimization)

Add indexes to improve query performance:

```typescript
// In MongoDB shell or migration script
db.activitylogs.createIndex({ createdAt: -1 });
db.activitylogs.createIndex({ userId: 1, createdAt: -1 });
db.activitylogs.createIndex({ category: 1, level: 1 });
db.activitylogs.createIndex({ endpoint: 1 });

db.errorlogs.createIndex({ createdAt: -1 });
db.errorlogs.createIndex({ severity: 1, isResolved: 1 });
db.errorlogs.createIndex({ userId: 1 });

db.ailogs.createIndex({ createdAt: -1 });
db.ailogs.createIndex({ userId: 1, createdAt: -1 });
db.ailogs.createIndex({ aiModel: 1 });

db.chatlogs.createIndex({ createdAt: -1 });
db.chatlogs.createIndex({ conversationId: 1 });
db.chatlogs.createIndex({ senderId: 1 });

db.systemlogs.createIndex({ createdAt: -1 });
db.systemlogs.createIndex({ status: 1, requiresAction: 1 });
```

## Log Retention Policy

Create a cleanup service to archive/delete old logs:

**Create: `backend/src/shared/services/log-cleanup.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog } from '../../activity-logs/entities/activity-log.entity';
import { ErrorLog } from '../../activity-logs/entities/error-log.entity';
import { AiLog } from '../../activity-logs/entities/ai-log.entity';
import { ChatLog } from '../../activity-logs/entities/chat-log.entity';
import { SystemLog } from '../../activity-logs/entities/system-log.entity';

@Injectable()
export class LogCleanupService {
  private readonly logger = new Logger(LogCleanupService.name);
  private readonly RETENTION_DAYS = 90; // Keep logs for 90 days

  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLog>,
    @InjectModel(ErrorLog.name) private errorLogModel: Model<ErrorLog>,
    @InjectModel(AiLog.name) private aiLogModel: Model<AiLog>,
    @InjectModel(ChatLog.name) private chatLogModel: Model<ChatLog>,
    @InjectModel(SystemLog.name) private systemLogModel: Model<SystemLog>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    try {
      const [activity, errors, ai, chat, system] = await Promise.all([
        this.activityLogModel.deleteMany({ createdAt: { $lt: cutoffDate } }),
        this.errorLogModel.deleteMany({
          createdAt: { $lt: cutoffDate },
          isResolved: true, // Only delete resolved errors
        }),
        this.aiLogModel.deleteMany({ createdAt: { $lt: cutoffDate } }),
        this.chatLogModel.deleteMany({ createdAt: { $lt: cutoffDate } }),
        this.systemLogModel.deleteMany({
          createdAt: { $lt: cutoffDate },
          requiresAction: false, // Keep logs that require action
        }),
      ]);

      this.logger.log(
        `Log cleanup completed: Activity(${activity.deletedCount}), Errors(${errors.deletedCount}), AI(${ai.deletedCount}), Chat(${chat.deletedCount}), System(${system.deletedCount})`,
      );
    } catch (error) {
      this.logger.error('Log cleanup failed:', error);
    }
  }
}
```

**Register in `app.module.ts`:**

```typescript
import { LogCleanupService } from './shared/services/log-cleanup.service';

@Module({
  providers: [
    // ... existing providers
    LogCleanupService, // Add this
  ],
})
export class AppModule {}
```

## Additional Resources

- **MongoDB Indexing**: Add indexes for better query performance (see above)
- **Log Retention Policy**: Implement cleanup for logs older than X days (see above)
- **Real-time Updates**: Consider WebSocket integration for live log streaming
- **Log Aggregation**: Use tools like ELK Stack for advanced log analysis
- **Performance Monitoring**: Use APM tools like New Relic or Datadog
- **Alerting**: Set up alerts for critical errors or system health issues
