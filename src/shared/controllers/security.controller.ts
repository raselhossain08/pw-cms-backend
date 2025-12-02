import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SystemConfigService } from '../../system-config/system-config.service';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
  constructor(private systemConfigService: SystemConfigService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get security status' })
  async getSecurityStatus() {
    const securityEnabled = await this.systemConfigService.getValue(
      'SECURITY_ENABLED',
      'false',
    );

    return {
      security: {
        enabled: securityEnabled === 'true',
      },
      message:
        securityEnabled === 'true'
          ? '🔒 All security features are active'
          : '⚠️ Security features are disabled',
    };
  }

  @Put('toggle')
  @ApiOperation({
    summary: 'Enable/Disable security features (requires server restart)',
  })
  async toggleSecurity(@Body() body: { enabled: boolean }) {
    await this.systemConfigService.update('SECURITY_ENABLED', {
      value: body.enabled ? 'true' : 'false',
    });

    return {
      message: body.enabled
        ? '✅ Security enabled - Please restart the server to apply changes'
        : '⚠️ Security disabled - Please restart the server to apply changes',
      securityEnabled: body.enabled,
      restartRequired: true,
    };
  }
}
