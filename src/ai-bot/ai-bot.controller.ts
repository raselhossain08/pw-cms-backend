import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  Delete,
  Put,
} from '@nestjs/common';
import { AiBotService } from './ai-bot.service';
import {
  SendMessageDto,
  CreateKnowledgeDto,
  RateBotDto,
  EscalateToHumanDto,
} from './dto/ai-bot.dto';
import {
  CreateBotTaskDto,
  UpdateBotTaskDto,
  AssignTaskDto,
  BulkAssignTaskDto,
} from './dto/bot-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('ai-bot')
export class AiBotController {
  constructor(private readonly aiBotService: AiBotService) {}

  // Customer endpoints
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  sendMessage(@Body() sendMessageDto: SendMessageDto, @Request() req) {
    return this.aiBotService.sendMessage(req.user.userId, sendMessageDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Request() req, @Query('sessionId') sessionId?: string) {
    return this.aiBotService.getConversationHistory(req.user.userId, sessionId);
  }

  @Post('rate')
  @UseGuards(JwtAuthGuard)
  rateConversation(@Body() rateBotDto: RateBotDto) {
    return this.aiBotService.rateConversation(
      rateBotDto.sessionId,
      parseInt(rateBotDto.rating),
      rateBotDto.feedback,
    );
  }

  @Post('escalate')
  @UseGuards(JwtAuthGuard)
  escalateToHuman(@Body() escalateDto: EscalateToHumanDto, @Request() req) {
    return this.aiBotService.escalateToHuman(
      escalateDto.sessionId,
      escalateDto.reason || 'user_request',
      req.user.userId,
    );
  }

  // Admin endpoints - Knowledge base management
  @Post('knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  addKnowledge(@Body() createKnowledgeDto: CreateKnowledgeDto) {
    return this.aiBotService.addKnowledge(createKnowledgeDto);
  }

  @Get('knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getKnowledge(@Query() filters: any) {
    return this.aiBotService.getKnowledgeBase(filters);
  }

  @Patch('knowledge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateKnowledge(
    @Param('id') id: string,
    @Body() updates: Partial<CreateKnowledgeDto>,
  ) {
    return this.aiBotService.updateKnowledge(id, updates);
  }

  @Delete('knowledge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteKnowledge(@Param('id') id: string) {
    return this.aiBotService.deleteKnowledge(id);
  }

  // Admin analytics
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiBotService.getBotAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // Task Management Endpoints
  @Post('tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  createTask(@Body() createTaskDto: CreateBotTaskDto, @Request() req) {
    return this.aiBotService.createTask(createTaskDto, req.user.userId);
  }

  @Get('tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getTasks(@Query() filters: any) {
    return this.aiBotService.getTasks(filters);
  }

  @Get('tasks/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTaskStats() {
    return this.aiBotService.getTaskStats();
  }

  @Get('tasks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getTaskById(@Param('id') id: string) {
    return this.aiBotService.getTaskById(id);
  }

  @Put('tasks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  updateTask(@Param('id') id: string, @Body() updateDto: UpdateBotTaskDto) {
    return this.aiBotService.updateTask(id, updateDto);
  }

  @Post('tasks/:id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  assignTask(@Param('id') id: string, @Body() assignDto: AssignTaskDto) {
    return this.aiBotService.assignTask(id, assignDto.assignedTo);
  }

  @Post('tasks/bulk/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  bulkAssignTasks(@Body() bulkAssignDto: BulkAssignTaskDto) {
    return this.aiBotService.bulkAssignTasks(
      bulkAssignDto.taskIds,
      bulkAssignDto.assignedTo,
    );
  }

  @Delete('tasks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteTask(@Param('id') id: string) {
    return this.aiBotService.deleteTask(id);
  }
}
