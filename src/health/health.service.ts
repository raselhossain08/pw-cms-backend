import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private connection: Connection,
    private configService: ConfigService,
  ) {}

  async checkHealth() {
    const dbStatus = this.connection.readyState === 1 ? 'healthy' : 'unhealthy';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV'),
      database: {
        status: dbStatus,
        readyState: this.connection.readyState,
      },
    };
  }

  async getDetailedHealth() {
    const basic = await this.checkHealth();

    return {
      ...basic,
      memory: process.memoryUsage(),
      versions: process.versions,
      database: {
        ...basic.database,
        host: this.connection.host,
        port: this.connection.port,
        name: this.connection.name,
      },
    };
  }
}
