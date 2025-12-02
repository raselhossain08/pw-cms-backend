import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
  })
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req,
  ) {
    return this.chatService.createConversation(
      createConversationDto,
      req.user.id,
    );
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.chatService.getUserConversations(req.user.id, page, limit);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('id') id: string, @Req() req) {
    return this.chatService.getConversation(id, req.user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of messages' })
  async getMessages(
    @Param('id') conversationId: string,
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.chatService.getMessages(
      conversationId,
      req.user.id,
      page,
      limit,
    );
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('id') conversationId: string,
    @Body() createMessageDto: CreateMessageDto,
    @Req() req,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      createMessageDto,
      req.user.id,
    );
  }

  @Patch('messages/:id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(@Param('id') messageId: string, @Req() req) {
    return this.chatService.markAsRead(messageId, req.user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  async deleteConversation(@Param('id') id: string, @Req() req) {
    return this.chatService.deleteConversation(id, req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread messages count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Req() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }
}
