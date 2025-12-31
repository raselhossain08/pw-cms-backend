import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat.service';
import { AIChatService } from '../services/ai-chat.service';
import { ChatLoggerService } from '../services/chat-logger.service';
import { MessageType } from '../entities/message.entity';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  },
  namespace: '/chat',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private chatService: ChatService,
    private aiChatService: AIChatService,
    private chatLoggerService: ChatLoggerService,
  ) { }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    this.chatService.setSocketServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`New connection attempt: ${client.id}`);

      // Check if this is a guest connection (support conversation)
      const isGuest = client.handshake.auth.isGuest === 'true';
      const guestUserId = client.handshake.auth.guestUserId;
      const token = client.handshake.auth.token;

      this.logger.debug(
        `Auth parameters received - isGuest: ${isGuest}, guestUserId: ${guestUserId}, hasToken: ${!!token}`,
      );
      this.logger.debug(
        `Handshake auth object: ${JSON.stringify(client.handshake.auth)}`,
      );

      let userId: string | undefined;

      // Handle guest users (support conversations)
      if (isGuest && guestUserId) {
        userId = guestUserId;
        client.data.userId = userId;
        client.data.isGuest = true;
        this.logger.log(
          `Guest user connected: ${guestUserId} (Socket: ${client.id})`,
        );
        this.logger.debug(
          `Guest auth details - isGuest: ${isGuest}, guestUserId: ${guestUserId}`,
        );
      }
      // Handle authenticated users with JWT token
      else if (token) {
        try {
          // Extract and verify JWT token
          const jwtService = new JwtService({});

          const actualToken = token.replace('Bearer ', '');
          const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

          this.logger.debug(`Attempting to verify token with secret length: ${jwtSecret.length}`);

          const payload = await jwtService.verifyAsync(actualToken, {
            secret: jwtSecret,
          });

          userId = payload.sub;
          client.data.userId = userId;
          client.data.user = payload;
          this.logger.log(
            `Authenticated user connected: ${userId} (Socket: ${client.id})`,
          );
        } catch (error) {
          this.logger.error(`JWT verification failed: ${error.message}`);
          this.logger.debug(`Token received: ${token?.substring(0, 20)}...`);
          client.disconnect();
          return;
        }
      }

      if (!userId) {
        this.logger.error('No valid authentication provided');
        client.disconnect();
        return;
      }

      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;

      this.logger.log(`Chat client connected: ${client.id} (User: ${userId})`);

      // Get user's recent conversations with error handling
      try {
        // Check if this is a support/admin user requesting all support conversations
        // You can add role check here if you have user roles
        // For now, we'll check if query param is passed
        const includeAllSupport = client.handshake.query.includeSupport === 'true';

        let conversations;
        if (includeAllSupport) {
          // Fetch all support conversations for dashboard
          this.logger.log(`Fetching all support conversations for admin user ${userId}`);
          conversations = await this.chatService.getAllSupportConversations();
        } else {
          // Fetch only user's own conversations
          conversations = await this.chatService.getUserConversations(userId);
        }

        if (!conversations || !conversations.conversations) {
          this.logger.warn(`No conversations found for user ${userId}`);
          client.emit('conversations_list', { conversations: [], total: 0 });
        } else {
          this.logger.log(
            `Sending ${conversations.conversations.length} conversations to user ${userId}`,
          );
          client.emit('conversations_list', conversations);
        }
      } catch (convError) {
        this.logger.error(
          `Error fetching conversations for user ${userId}: ${convError.message}`,
        );
        client.emit('conversations_list', { conversations: [], total: 0 });
      }
    } catch (error) {
      this.logger.error(`Chat connection error: ${error.message}`, error.stack);
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
        return { success: false, error: 'Cannot access this conversation' };
      }

      client.join(`conversation_${data.conversationId}`);

      // Load conversation messages
      const messages = await this.chatService.getConversationMessages(
        data.conversationId,
        userId,
      );

      return { success: true, messages: messages.messages };
    } catch (error) {
      this.logger.error(`Join conversation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: string;
      aiConfig?: {
        enabled?: boolean;
        provider?: 'chatgpt' | 'gemini' | 'custom';
        responseDelay?: number;
        tone?: 'professional' | 'friendly' | 'casual' | 'formal';
        autoRespondWhen?: 'always' | 'offline' | 'busy' | 'afterHours';
        confidenceThreshold?: number;
      };
    },
  ) {
    try {
      const userId = client.data.userId;

      // Spam Detection
      const spamCheck = await this.chatService.detectSpam(data.content, userId);
      if (spamCheck.isSpam) {
        return { success: false, error: spamCheck.reason };
      }

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

      // Generate AI response if configured
      if (data.aiConfig?.enabled) {
        try {
          // Check if AI should respond based on status and config
          // We default to 'offline' status to ensure AI responds during testing/dev
          // unless explicitly configured otherwise
          const shouldRespond = await this.aiChatService.shouldAIRespond(
            'offline',
            data.aiConfig.autoRespondWhen || 'always',
          );

          if (shouldRespond) {
            // Get conversation history for context
            const conversationHistory =
              await this.chatService.getConversationMessages(
                data.conversationId,
                userId,
              );

            const aiResponse = await this.aiChatService.generateAIResponse(
              data.content,
              conversationHistory.messages,
              data.aiConfig,
            );

            if (aiResponse) {
              // Add delay for natural response timing
              await new Promise((resolve) =>
                setTimeout(resolve, data.aiConfig?.responseDelay || 1500),
              );

              // Create and send AI response message
              const aiMessage = await this.chatService.createMessage({
                conversation: data.conversationId,
                sender: 'ai-assistant', // Special sender ID for AI
                content: aiResponse.content,
                type: MessageType.AI_RESPONSE,
                metadata: {
                  isAI: true,
                  confidence: aiResponse.confidence,
                  quickReplies: aiResponse.quickReplies,
                  suggestedActions: aiResponse.suggestedActions,
                },
              });

              // Broadcast AI response
              this.server
                .to(`conversation_${data.conversationId}`)
                .emit('new_message', aiMessage);
            }
          }
        } catch (aiError) {
          this.logger.error(
            `AI response generation failed: ${aiError.message}`,
            aiError.stack,
          );
          // Continue with normal message processing even if AI fails
        }
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;

      // Broadcast typing indicator to conversation room (excluding sender)
      client.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: true,
      });

      // Log typing activity
      await this.chatLoggerService.logMessage(
        data.conversationId,
        `typing-${Date.now()}`,
        userId,
        'user',
        'User started typing',
        'typing_indicator',
        { isTyping: true },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Typing start error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;

      // Broadcast typing stop to conversation room (excluding sender)
      client.to(`conversation_${data.conversationId}`).emit('user_typing', {
        userId,
        conversationId: data.conversationId,
        isTyping: false,
      });

      // Log typing activity
      await this.chatLoggerService.logMessage(
        data.conversationId,
        `typing-${Date.now()}`,
        userId,
        'user',
        'User stopped typing',
        'typing_indicator',
        { isTyping: false },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Typing stop error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update_status')
  async handleStatusUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: 'online' | 'away' | 'busy' | 'offline' },
  ) {
    try {
      const userId = client.data.userId;

      // Broadcast status update to all connected clients
      this.server.emit('user_status_changed', {
        userId,
        status: data.status,
        timestamp: new Date(),
      });

      // Log status change
      await this.chatLoggerService.logMessage(
        'system',
        `status-${Date.now()}`,
        userId,
        'user',
        `User status changed to ${data.status}`,
        'status_update',
        { status: data.status },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Status update error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('create_conversation')
  async handleCreateConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { title: string; participants: string[]; type: string },
  ) {
    try {
      const userId = client.data.userId;

      // Ensure current user is in participants (if not already)
      const allParticipants = data.participants.includes(userId)
        ? data.participants
        : [...data.participants, userId];

      const conversation = await this.chatService.createConversation(
        {
          participantIds: allParticipants,
          title: data.title,
        },
        userId,
      );

      const conversationId = (conversation as any)._id.toString();

      const populatedConversation = await this.chatService.getConversation(
        conversationId,
        userId,
      );

      // Notify all participants
      for (const participantId of allParticipants) {
        this.server
          .to(`user_${participantId}`)
          .emit('new_conversation', populatedConversation);
      }

      return { success: true, conversation: populatedConversation };
    } catch (error) {
      this.logger.error(`Error creating conversation: ${error.message}`);
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

  // Support status events
  @SubscribeMessage('get_support_status')
  async handleGetSupportStatus(@ConnectedSocket() client: Socket) {
    try {
      // In a real implementation, this would check support agent availability
      // For now, return a mock status
      const status: 'online' | 'offline' | 'busy' = 'online';
      client.emit('support_status', status);
      return { success: true, status };
    } catch (error) {
      this.logger.error(`Get support status error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('update_support_status')
  async handleUpdateSupportStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: 'online' | 'offline' | 'busy' },
  ) {
    try {
      const userId = client.data.userId;

      // Verify user has permission to update support status (admin/support agent)
      // This would be implemented with proper role checking

      // Broadcast to all connected clients
      this.server.emit('support_status', data.status);

      this.logger.log(
        `Support status updated to: ${data.status} by user: ${userId}`,
      );
      return { success: true, status: data.status };
    } catch (error) {
      this.logger.error(`Update support status error: ${error.message}`);
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
