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
  Res,
  Sse,
  Options,
} from '@nestjs/common';
import { Observable } from 'rxjs';
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
import { CreateSupportConversationDto } from './dto/create-support-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatAuthGuard } from './guards/chat-auth.guard';

import { JwtService } from '@nestjs/jwt';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) { }

  @Post('conversations')
  @UseGuards(JwtAuthGuard)
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

  @Post('conversations/support')
  @ApiOperation({ summary: 'Create a new support conversation' })
  @ApiResponse({
    status: 201,
    description: 'Support conversation created successfully',
  })
  async createSupportConversation(
    @Body() createSupportConversationDto: CreateSupportConversationDto,
    @Req() req,
  ) {
    // Check if user is authenticated
    let userId: string;
    let isAuthenticated = false;
    let userName: string;
    let userEmail: string;

    try {
      // Try to get authenticated user from JWT token
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET,
        });
        userId = payload.sub;
        isAuthenticated = true;

        // For authenticated users, fetch their info from the database
        const user = await this.chatService.getUserById(userId);
        if (user) {
          userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
          userEmail = user.email || '';
        } else {
          userName = createSupportConversationDto.name || 'User';
          userEmail = createSupportConversationDto.email || '';
        }
      } else {
        throw new Error('No token');
      }
    } catch (error) {
      // For unauthenticated users, use the provided info
      isAuthenticated = false;
      userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      userName = createSupportConversationDto.name;
      userEmail = createSupportConversationDto.email;
    }

    const conversation = await this.chatService.createSupportConversation(
      {
        ...createSupportConversationDto,
        name: userName,
        email: userEmail,
      },
      userId,
    );

    // Generate a token for guest users with 10-minute expiry
    const responseToken = isAuthenticated
      ? null
      : this.jwtService.sign(
        {
          sub: userId,
          email: userEmail,
          role: 'guest',
          name: userName,
          conversationId: conversation._id,
        },
        {
          expiresIn: '10m', // Token expires in 10 minutes
        }
      );

    // Return both conversation and user ID for socket authentication
    return {
      conversation,
      userId,
      token: responseToken,
      isAuthenticated,
    };
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeSupport', required: false, type: Boolean, description: 'Include all support conversations (for admin/support users)' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('includeSupport') includeSupport: boolean = false,
  ) {
    // If includeSupport is true, return all support conversations (guest user conversations)
    if (includeSupport) {
      return this.chatService.getAllSupportConversations(page, limit);
    }
    return this.chatService.getUserConversations(req.user.id, page, limit);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  async getConversation(@Param('id') id: string, @Req() req) {
    return this.chatService.getConversation(id, req.user.id);
  }

  @Get('conversations/:id/messages')
  @UseGuards(ChatAuthGuard) // Changed to ChatAuthGuard to support guest users
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
  @UseGuards(ChatAuthGuard) // Changed to ChatAuthGuard to support guest users
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

  @Post('conversations/:id/typing')
  @UseGuards(ChatAuthGuard) // Changed to ChatAuthGuard to support guest users
  @ApiOperation({ summary: 'Send typing indicator' })
  @ApiResponse({ status: 200, description: 'Typing indicator sent' })
  async sendTypingIndicator(
    @Param('id') conversationId: string,
    @Req() req,
  ) {
    return this.chatService.sendTypingIndicator(conversationId, req.user.id);
  }

  @Post('conversations/:id/join')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Join conversation' })
  @ApiResponse({ status: 200, description: 'Joined conversation successfully' })
  async joinConversation(
    @Param('id') conversationId: string,
    @Req() req,
  ) {
    return this.chatService.joinConversation(conversationId, req.user.id);
  }

  @Patch('messages/:id/read')
  @UseGuards(JwtAuthGuard)
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

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async updateMessage(
    @Param('id') messageId: string,
    @Body() body: { content: string },
    @Req() req,
  ) {
    return this.chatService.updateMessage(messageId, body.content, req.user.id);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('id') messageId: string, @Req() req) {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread messages count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Req() req) {
    return this.chatService.getUnreadCount(req.user.id);
  }

  @Get('monitoring/stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get real-time monitoring statistics' })
  @ApiResponse({ status: 200, description: 'Monitoring statistics' })
  async getMonitoringStats() {
    return this.chatService.getMonitoringStats();
  }

  @Get('monitoring/sessions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get active chat sessions' })
  @ApiResponse({ status: 200, description: 'Active chat sessions' })
  async getActiveSessions() {
    return this.chatService.getActiveSessions();
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Cleanup invalid conversations and messages' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  async cleanupConversations() {
    return this.chatService.cleanupInvalidConversations();
  }

  @Patch('conversations/:id/archive')
  @ApiOperation({ summary: 'Archive or unarchive a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation archived status updated',
  })
  async archiveConversation(
    @Param('id') id: string,
    @Body() body: { archived: boolean },
    @Req() req,
  ) {
    return this.chatService.archiveConversation(id, req.user.id, body.archived);
  }

  @Patch('conversations/:id/star')
  @ApiOperation({ summary: 'Star or unstar a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Conversation starred status updated',
  })
  async starConversation(
    @Param('id') id: string,
    @Body() body: { starred: boolean },
    @Req() req,
  ) {
    return this.chatService.starConversation(id, req.user.id, body.starred);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload a file for chat' })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
  })
  async uploadFile(
    @Req() req,
    @Body() body: { conversationId: string; fileName: string; fileType: string; fileSize: number }
  ) {
    // This endpoint handles file metadata - actual file upload would be handled separately
    // In a real implementation, you would use Multer for file uploads
    return this.chatService.handleFileUpload({
      conversationId: body.conversationId,
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      userId: req.user.id
    });
  }

  @Options()

  @ApiOperation({
    summary: 'CORS preflight for SSE connections',
  })
  @ApiResponse({ status: 200, description: 'CORS preflight handled' })
  async sseOptions(@Res() res: any) {
    // Handle CORS preflight for SSE
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Last-Event-ID');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).send();
  }

  @Get('sse')
  @ApiOperation({
    summary: 'Server-Sent Events stream for real-time chat updates',
  })
  @ApiResponse({ status: 200, description: 'SSE connection established' })
  async sse(
    @Res() res: any,
    @Req() req: any,
    @Query('conversationId') conversationId?: string,
    @Query('lastEventId') lastEventId?: string,
    @Query('token') tokenParam?: string,
  ) {
    // Verify authentication - token can come from header or query param
    let userId: string;
    try {
      const token = tokenParam || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(401).json({ message: 'Unauthorized: No token provided' });
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      userId = payload.sub;
    } catch (error) {
      console.error('SSE authentication failed:', error);
      res.status(401).json({ message: 'Unauthorized: Invalid token' });
      return;
    }

    // Set proper SSE headers
    const origin = req.headers.origin || 'http://localhost:3000';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx

    // Send immediate connection confirmation
    res.write(
      `event: connected\ndata: {\"message\":\"SSE connection established\",\"userId\":\"${userId}\",\"timestamp\":${Date.now()}}\n\n`,
    );

    // Send initial heartbeat immediately to prevent timeout
    res.write(`event: heartbeat\ndata: {\"timestamp\":${Date.now()}}\n\n`);

    // Register SSE client for broadcasting if conversationId is provided
    if (conversationId) {
      this.chatService.registerSSEClient(conversationId, res);
    }

    // Heartbeat to keep connection alive (every 15 seconds instead of 25)
    const heartbeatInterval = setInterval(() => {
      try {
        if (!res.writableEnded && !res.destroyed) {
          res.write(`event: heartbeat\ndata: {\"timestamp\":${Date.now()}}\n\n`);
        } else {
          clearInterval(heartbeatInterval);
        }
      } catch (error) {
        // Client disconnected, stop heartbeat
        clearInterval(heartbeatInterval);
      }
    }, 15000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      if (conversationId) {
        this.chatService.unregisterSSEClient(conversationId);
      }
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Handle connection errors
    req.on('error', (error) => {
      // Only log if it's not a connection reset error (common with SSE)
      if (error.code !== 'ECONNRESET') {
        console.error('SSE connection error:', error);
      }
      clearInterval(heartbeatInterval);
      if (conversationId) {
        this.chatService.unregisterSSEClient(conversationId);
      }
      if (!res.writableEnded) {
        res.end();
      }
    });

    // Handle response errors
    res.on('error', (error) => {
      if (error.code !== 'ECONNRESET') {
        console.error('SSE response error:', error);
      }
      clearInterval(heartbeatInterval);
    });

    // Flush headers immediately
    res.flushHeaders();

    // Keep the connection open
    return res;
  }
}
