import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
}
