import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  Delete,
  Req,
} from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  QueryLogsDto,
  QueryErrorLogsDto,
  QueryAiLogsDto,
  QueryChatLogsDto,
  QuerySystemLogsDto,
} from './dto/query-logs.dto';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  // ==================== ACTIVITY LOGS ====================
  @Get('activity')
  getActivityLogs(@Query() query: QueryLogsDto) {
    return this.activityLogsService.getActivityLogs(query);
  }

  @Get('activity/stats')
  getActivityStats() {
    return this.activityLogsService.getActivityStats();
  }

  // ==================== ERROR LOGS ====================
  @Get('errors')
  getErrorLogs(@Query() query: QueryErrorLogsDto) {
    return this.activityLogsService.getErrorLogs(query);
  }

  @Get('errors/stats')
  getErrorStats() {
    return this.activityLogsService.getErrorStats();
  }

  // ==================== AI LOGS ====================
  @Get('ai')
  getAiLogs(@Query() query: QueryAiLogsDto) {
    return this.activityLogsService.getAiLogs(query);
  }

  @Get('ai/stats')
  getAiStats() {
    return this.activityLogsService.getAiStats();
  }

  // ==================== CHAT LOGS ====================
  @Get('chat')
  getChatLogs(@Query() query: QueryChatLogsDto) {
    return this.activityLogsService.getChatLogs(query);
  }

  @Get('chat/stats')
  getChatStats() {
    return this.activityLogsService.getChatStats();
  }

  // ==================== SYSTEM LOGS ====================
  @Get('system')
  getSystemLogs(@Query() query: QuerySystemLogsDto) {
    return this.activityLogsService.getSystemLogs(query);
  }

  @Get('system/stats')
  getSystemStats() {
    return this.activityLogsService.getSystemStats();
  }

  // ==================== EXPORT ====================
  @Get('export/:type')
  exportLogs(@Param('type') type: string, @Query() query: any) {
    return this.activityLogsService.exportLogs(type, query);
  }

  // ==================== LOG ACTIONS ====================
  @Get(':type/:id')
  getLogById(@Param('type') type: string, @Param('id') id: string) {
    return this.activityLogsService.getLogById(type, id);
  }

  @Post('errors/:id/resolve')
  markErrorAsResolved(
    @Param('id') id: string,
    @Body() body: { solution?: string },
    @Req() req: any,
  ) {
    return this.activityLogsService.markErrorAsResolved(
      id,
      req.user.id,
      body.solution,
    );
  }

  @Post('errors/:id/unresolve')
  markErrorAsUnresolved(@Param('id') id: string) {
    return this.activityLogsService.markErrorAsUnresolved(id);
  }

  @Post('errors/bulk-resolve')
  bulkMarkErrorsAsResolved(
    @Body() body: { ids: string[]; solution?: string },
    @Req() req: any,
  ) {
    return this.activityLogsService.bulkMarkErrorsAsResolved(
      body.ids,
      req.user.id,
      body.solution,
    );
  }

  @Delete(':type/:id')
  deleteLog(@Param('type') type: string, @Param('id') id: string) {
    return this.activityLogsService.deleteLog(type, id);
  }

  @Post(':type/bulk-delete')
  bulkDeleteLogs(@Param('type') type: string, @Body() body: { ids: string[] }) {
    return this.activityLogsService.bulkDeleteLogs(type, body.ids);
  }
}
