import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private startTime: number;
  private requestCount = 0;
  private slowQueries: any[] = [];

  constructor(@InjectConnection() private connection: Connection) {
    this.startTime = Date.now();
    this.setupDatabaseMonitoring();
  }

  private setupDatabaseMonitoring() {
    // Monitor slow queries
    this.connection.on('commandStarted', (event) => {
      event['startTime'] = Date.now();
    });

    this.connection.on('commandSucceeded', (event: any) => {
      const duration = Date.now() - (event.startTime || Date.now());
      if (duration > 100) { // Log queries > 100ms
        this.slowQueries.push({
          command: event.commandName,
          duration,
          timestamp: new Date(),
        });
        this.logger.warn(`Slow query detected: ${event.commandName} (${duration}ms)`);
      }
    });
  }

  incrementRequestCount() {
    this.requestCount++;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  logPerformanceMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const memory = process.memoryUsage();
    
    this.logger.log({
      uptime: `${Math.floor(uptime)}s`,
      requests: this.requestCount,
      requestsPerSecond: (this.requestCount / uptime).toFixed(2),
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
      },
      slowQueries: this.slowQueries.length,
    });
  }

  getMetrics() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const memory = process.memoryUsage();

    return {
      uptime,
      requests: this.requestCount,
      requestsPerSecond: this.requestCount / uptime,
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
      },
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
    };
  }
}

