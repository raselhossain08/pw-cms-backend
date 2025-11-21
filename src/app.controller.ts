import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Backend health check' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'Backend is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed database with default data' })
  async seedDatabase() {
    return this.appService.seedDatabase();
  }
}
