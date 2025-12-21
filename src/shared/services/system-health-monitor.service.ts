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
  ) { }

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
      // Simple implementation - for production, consider using 'node-disk-info' package
      // For now, return a basic calculation based on process memory
      // This is a simplified version
      return 0; // Placeholder - install 'node-disk-info' for actual disk usage
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
