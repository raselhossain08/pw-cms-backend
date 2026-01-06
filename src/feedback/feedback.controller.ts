import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackStatsDto } from './dto/feedback-stats.dto';
import { Feedback, FeedbackType } from './feedback.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Create feedback' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feedback created successfully',
    type: Feedback,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid feedback data',
  })
  async create(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(createFeedbackDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feedback with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: FeedbackType,
    description: 'Filter by feedback type',
  })
  @ApiQuery({
    name: 'resolved',
    required: false,
    type: Boolean,
    description: 'Filter by resolved status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by message, name or email',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback items',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('type') type?: FeedbackType,
    @Query('resolved') resolved?: boolean,
    @Query('search') search?: string,
  ) {
    return this.feedbackService.findAll(
      parseInt(page as any),
      parseInt(limit as any),
      type,
      resolved,
      search,
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback statistics',
  })
  async getStats(@Query() filters?: FeedbackStatsDto) {
    return this.feedbackService.getStats(filters);
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD, UserRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent feedback' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent items to fetch',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recent feedback items',
  })
  async getRecent(@Query('limit') limit = 5) {
    return this.feedbackService.getRecentFeedback(parseInt(limit as any));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback details',
    type: Feedback,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback updated successfully',
    type: Feedback,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ) {
    return this.feedbackService.update(id, updateFeedbackDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async remove(@Param('id') id: string) {
    return this.feedbackService.remove(id);
  }

  @Post(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark feedback as resolved' })
  @ApiQuery({
    name: 'notes',
    required: false,
    type: String,
    description: 'Resolution notes',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback marked as resolved',
    type: Feedback,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async markAsResolved(
    @Param('id') id: string,
    @Body('resolvedBy') resolvedBy: string,
    @Query('notes') notes?: string,
  ) {
    return this.feedbackService.markAsResolved(id, resolvedBy, notes);
  }

  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD, UserRole.SUPPORT_AGENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback for a conversation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback for the conversation',
  })
  async getByConversation(@Param('conversationId') conversationId: string) {
    return this.feedbackService.getFeedbackByConversation(conversationId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT_LEAD)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback by user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback from the user',
  })
  async getByUser(@Param('userId') userId: string) {
    return this.feedbackService.getFeedbackByUser(userId);
  }
}
