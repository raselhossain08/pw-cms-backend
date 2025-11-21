import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SystemStatusService, SystemStatusDto } from './system-status.service';

@ApiTags('System Status')
@Controller('system-status')
export class SystemStatusController {
  constructor(private readonly systemStatusService: SystemStatusService) {}

  @Get()
  @ApiOperation({
    summary: 'Get system status information',
    description: 'Returns current system status including storage, performance, and health metrics'
  })
  @ApiResponse({
    status: 200,
    description: 'System status retrieved successfully',
    type: 'object'
  })
  async getSystemStatus(): Promise<SystemStatusDto> {
    return this.systemStatusService.getSystemStatus();
  }

  @Get('storage')
  @ApiOperation({
    summary: 'Get storage information only',
    description: 'Returns detailed storage usage information'
  })
  @ApiResponse({
    status: 200,
    description: 'Storage information retrieved successfully'
  })
  async getStorageInfo() {
    const status = await this.systemStatusService.getSystemStatus();
    return {
      ...status.storage,
      details: {
        uploadsPath: 'uploads/',
        lastCalculated: new Date().toISOString()
      }
    };
  }

  @Patch('storage/limit')
  @ApiOperation({
    summary: 'Update storage limit',
    description: 'Updates the storage limit for the system (requires restart to take effect with environment variable)'
  })
  @ApiResponse({
    status: 200,
    description: 'Storage limit updated successfully'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        limitGB: {
          type: 'number',
          description: 'Storage limit in gigabytes',
          example: 10
        }
      }
    }
  })
  async updateStorageLimit(@Body() body: { limitGB: number }) {
    return {
      message: `Storage limit configuration noted: ${body.limitGB}GB`,
      note: 'To persist this change, update STORAGE_LIMIT_GB in your .env file and restart the server',
      currentRequest: `${body.limitGB}GB`,
      envVariable: 'STORAGE_LIMIT_GB'
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Simple health check',
    description: 'Returns a simple health check response'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy'
  })
  async healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}