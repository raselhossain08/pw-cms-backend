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
    return this.aiBotService.sendMessage(req.user.id, sendMessageDto);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@Request() req, @Query('sessionId') sessionId?: string) {
    return this.aiBotService.getConversationHistory(req.user.id, sessionId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus() {
    return this.aiBotService.getStatus();
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
      req.user.id,
    );
  }

  @Delete('conversations/:sessionId')
  @UseGuards(JwtAuthGuard)
  deleteConversation(@Param('sessionId') sessionId: string, @Request() req) {
    return this.aiBotService.deleteConversation(sessionId, req.user.id);
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
    return this.aiBotService.createTask(createTaskDto, req.user.id);
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

  // AI Agent Management Endpoints
  @Get('agents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getAllAgents(@Query() filters: any) {
    return this.aiBotService.getAllAgents(filters);
  }

  @Get('agents/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAgentsAnalytics() {
    return this.aiBotService.getAgentsAnalytics();
  }

  @Get('agents/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getAgentConversations(@Query('agentId') agentId?: string) {
    return this.aiBotService.getAgentConversations(agentId);
  }

  @Get('agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getAgent(@Param('id') id: string) {
    return this.aiBotService.getAgent(id);
  }

  @Post('agents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createAgent(@Body() createAgentDto: any, @Request() req) {
    return this.aiBotService.createAgent(createAgentDto, req.user.id);
  }

  @Patch('agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateAgent(@Param('id') id: string, @Body() updateAgentDto: any) {
    return this.aiBotService.updateAgent(id, updateAgentDto);
  }

  @Patch('agents/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  toggleAgentStatus(@Param('id') id: string, @Body() statusDto: any) {
    return this.aiBotService.toggleAgentStatus(id, statusDto.status);
  }

  @Post('agents/:id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  duplicateAgent(@Param('id') id: string) {
    return this.aiBotService.duplicateAgent(id);
  }

  @Delete('agents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteAgent(@Param('id') id: string) {
    return this.aiBotService.deleteAgent(id);
  }

  @Get('agents/:id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAgentLogs(@Param('id') id: string) {
    return this.aiBotService.getAgentLogs(id);
  }

  @Get('conversations/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  getConversationMessages(@Param('id') id: string) {
    return this.aiBotService.getConversationMessages(id);
  }

  @Post('agents/:id/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  testAgent(
    @Param('id') id: string,
    @Body() testDto: { message: string; context?: any },
    @Request() req,
  ) {
    return this.aiBotService.testAgent(
      id,
      testDto.message,
      testDto.context,
      req.user.id,
    );
  }

  @Get('agents/:id/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAgentConfig(@Param('id') id: string) {
    return this.aiBotService.getAgentConfig(id);
  }

  @Put('agents/:id/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateAgentConfig(@Param('id') id: string, @Body() configDto: any) {
    return this.aiBotService.updateAgentConfig(id, configDto);
  }

  @Get('agents/:id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAgentAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.aiBotService.getAgentAnalytics(
      id,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
