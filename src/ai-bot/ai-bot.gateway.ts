import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { AiBotService } from './ai-bot.service';

@WebSocketGateway({ namespace: '/ai-bot', cors: { origin: '*' } })
@UseGuards(WsJwtGuard)
export class AiBotGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly aiBotService: AiBotService) {}

  handleConnection(client: Socket) {
    console.log(`AI Bot WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`AI Bot WebSocket client disconnected: ${client.id}`);
    this.activeUsers.delete(client.id);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    const { userId, sessionId } = data;
    this.activeUsers.set(client.id, userId);
    client.join(`bot-session-${sessionId}`);

    return {
      event: 'joined',
      data: { sessionId, message: 'Connected to AI assistant' },
    };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.activeUsers.get(client.id);
    if (!userId) {
      return { event: 'error', data: { message: 'User not authenticated' } };
    }

    // Show typing indicator
    this.server
      .to(`bot-session-${data.sessionId}`)
      .emit('bot-typing', { isTyping: true });

    try {
      const response = await this.aiBotService.sendMessage(userId, {
        message: data.message,
        sessionId: data.sessionId,
        context: data.context,
      });

      // Stop typing indicator
      this.server
        .to(`bot-session-${data.sessionId}`)
        .emit('bot-typing', { isTyping: false });

      // Send bot response
      this.server
        .to(`bot-session-${data.sessionId}`)
        .emit('bot-message', response);

      return { event: 'message-sent', data: response };
    } catch (error) {
      this.server
        .to(`bot-session-${data.sessionId}`)
        .emit('bot-typing', { isTyping: false });
      return { event: 'error', data: { message: error.message } };
    }
  }

  @SubscribeMessage('quick-reply')
  async handleQuickReply(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.activeUsers.get(client.id);
    if (!userId) {
      return { event: 'error', data: { message: 'User not authenticated' } };
    }

    // Process quick reply as a regular message
    return this.handleMessage(
      {
        message: data.reply,
        sessionId: data.sessionId,
        context: data.context,
      },
      client,
    );
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // Notify that user is typing (optional, for human agents)
    client.to(`bot-session-${data.sessionId}`).emit('user-typing', {
      isTyping: data.isTyping,
    });
  }

  // Notify when human agent joins the conversation
  notifyAgentJoined(sessionId: string, agentName: string) {
    this.server.to(`bot-session-${sessionId}`).emit('agent-joined', {
      message: `${agentName} has joined the conversation`,
      agentName,
    });
  }

  // Send message from human agent
  sendAgentMessage(sessionId: string, message: string, agentName: string) {
    this.server.to(`bot-session-${sessionId}`).emit('agent-message', {
      message,
      agentName,
      timestamp: new Date(),
    });
  }
}
