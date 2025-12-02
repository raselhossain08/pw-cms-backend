import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { ChatService } from '../chat.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/chat',
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(private chatService: ChatService) {}

  async handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;

      this.logger.log(`Chat client connected: ${client.id} (User: ${userId})`);

      // Get user's recent conversations
      const conversations = await this.chatService.getUserConversations(userId);
      client.emit('conversations_list', conversations);
    } catch (error) {
      this.logger.error(`Chat connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(
        `Chat client disconnected: ${client.id} (User: ${userId})`,
      );
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;

      // Verify user can access this conversation
      const canAccess = await this.chatService.canUserAccessConversation(
        data.conversationId,
        userId,
      );

      if (!canAccess) {
        return { success: false, error: 'Access denied' };
      }

      client.join(`conversation_${data.conversationId}`);

      // Load conversation messages
      const messages = await this.chatService.getConversationMessages(
        data.conversationId,
        userId,
      );

      return { success: true, messages };
    } catch (error) {
      this.logger.error(`Join conversation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; content: string; type?: string },
  ) {
    try {
      const userId = client.data.userId;

      const message = await this.chatService.createMessage({
        conversation: data.conversationId,
        sender: userId,
        content: data.content,
        type: (data.type as any) || 'text',
      });

      // Broadcast to conversation room
      this.server
        .to(`conversation_${data.conversationId}`)
        .emit('new_message', message);

      // Notify other participants
      const conversation = await this.chatService.getConversation(
        data.conversationId,
        userId,
      );
      conversation.participants.forEach((participant) => {
        if (participant.toString() !== userId) {
          this.sendToUser(participant.toString(), 'conversation_updated', {
            conversationId: data.conversationId,
            lastMessage: message,
          });
        }
      });

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('start_conversation')
  async handleStartConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { participantIds: string[]; title?: string },
  ) {
    try {
      const userId = client.data.userId;
      const allParticipants = [userId, ...data.participantIds];

      const conversation = await this.chatService.createConversation(
        {
          participantIds: allParticipants,
          title: data.title,
        },
        userId,
      );

      // Notify all participants
      allParticipants.forEach((participantId) => {
        this.sendToUser(participantId, 'new_conversation', conversation);
      });

      return { success: true, conversation };
    } catch (error) {
      this.logger.error(`Start conversation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;

    // Broadcast to conversation room (except sender)
    client.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId,
      conversationId: data.conversationId,
      typing: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = client.data.userId;

    client.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId,
      conversationId: data.conversationId,
      typing: false,
    });
  }

  @SubscribeMessage('mark_messages_read')
  async handleMarkMessagesRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageIds: string[] },
  ) {
    try {
      const userId = client.data.userId;

      await this.chatService.markMessagesAsRead(data.messageIds, userId);

      // Notify other participants
      client.to(`conversation_${data.conversationId}`).emit('messages_read', {
        userId,
        messageIds: data.messageIds,
        conversationId: data.conversationId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark messages read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private async sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
