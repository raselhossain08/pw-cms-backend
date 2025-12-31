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

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    path: '/chat',
    transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);
    private userSockets: Map<string, Socket> = new Map();
    private conversationSockets: Map<string, Set<string>> = new Map();

    constructor(
        // Inject your services here
        // private readonly chatService: ChatService,
        // private readonly aiService: AIService,
    ) { }

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        try {
            // Get conversation ID and token from query parameters
            const conversationId = client.handshake.query.conversationId as string;
            const token = client.handshake.query.token as string;

            this.logger.log(`Connection attempt - ConversationId: ${conversationId}`);

            // Validate conversation ID
            if (!conversationId) {
                this.logger.error('No conversation ID provided');
                client.emit('error', {
                    type: 'error',
                    error: 'Conversation ID is required',
                });
                client.disconnect();
                return;
            }

            // TODO: Validate token here
            // const isValid = await this.validateToken(token);
            // if (!isValid) {
            //   client.emit('error', { type: 'error', error: 'Invalid token' });
            //   client.disconnect();
            //   return;
            // }

            // Store socket mapping
            this.userSockets.set(client.id, client);

            // Add to conversation room
            client.join(conversationId);

            // Track sockets per conversation
            if (!this.conversationSockets.has(conversationId)) {
                this.conversationSockets.set(conversationId, new Set());
            }
            this.conversationSockets.get(conversationId)?.add(client.id);

            this.logger.log(
                `Client ${client.id} joined conversation: ${conversationId}`,
            );

            // Send connection success
            client.emit('connected', {
                type: 'connected',
                message: 'Connected to chat server',
            });
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.emit('error', {
                type: 'error',
                error: 'Failed to establish connection',
            });
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);

        // Remove from conversation tracking
        for (const [conversationId, sockets] of this.conversationSockets.entries()) {
            if (sockets.has(client.id)) {
                sockets.delete(client.id);
                if (sockets.size === 0) {
                    this.conversationSockets.delete(conversationId);
                }
                this.logger.log(
                    `Client ${client.id} left conversation: ${conversationId}`,
                );
            }
        }

        // Clean up socket mapping
        this.userSockets.delete(client.id);
    }

    @SubscribeMessage('authenticate')
    async handleAuthentication(
        @MessageBody() data: { conversationId: string; token: string },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.logger.log(`Authentication request from ${client.id}`);

            // TODO: Validate token and get user info
            // const user = await this.validateAndGetUser(data.token);
            // if (!user) {
            //   client.emit('error', { type: 'error', error: 'Invalid authentication' });
            //   return;
            // }

            // Send authentication confirmation
            client.emit('authenticated', {
                type: 'authenticated',
                success: true,
            });

            this.logger.log(`Client ${client.id} authenticated successfully`);
        } catch (error) {
            this.logger.error(`Authentication error: ${error.message}`);
            client.emit('error', {
                type: 'error',
                error: 'Authentication failed',
            });
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody()
        data: { conversationId: string; content: string; aiConfig?: any },
        @ConnectedSocket() client: Socket,
    ) {
        try {
            this.logger.log(
                `Message from ${client.id} in conversation ${data.conversationId}`,
            );

            // Validate input
            if (!data.content || data.content.trim().length === 0) {
                client.emit('error', {
                    type: 'error',
                    error: 'Message content is required',
                });
                return;
            }

            // TODO: Get user info from authenticated session
            // const userId = await this.getUserIdFromSocket(client);

            // TODO: Save message to database
            // const message = await this.chatService.createMessage({
            //   conversationId: data.conversationId,
            //   content: data.content,
            //   sender: userId,
            //   isAI: false,
            // });

            // Mock message for demonstration
            const message = {
                _id: `msg_${Date.now()}`,
                conversationId: data.conversationId,
                content: data.content,
                sender: 'user_id', // Replace with actual user ID
                isAI: false,
                createdAt: new Date(),
            };

            // Broadcast message to all participants in the conversation
            this.server.to(data.conversationId).emit('message', {
                type: 'message',
                message: message,
            });

            this.logger.log(`Message sent to conversation ${data.conversationId}`);

            // Update message status to delivered
            setTimeout(() => {
                this.server.to(data.conversationId).emit('messageStatus', {
                    type: 'messageStatus',
                    messageId: message._id,
                    status: 'delivered',
                });
            }, 500);

            // Check if AI should respond
            if (data.aiConfig?.enabled) {
                await this.handleAIResponse(data.conversationId, data.content, data.aiConfig);
            }

            return { success: true, messageId: message._id };
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            client.emit('error', {
                type: 'error',
                error: 'Failed to send message',
            });
            return { success: false, error: error.message };
        }
    }

    private async handleAIResponse(
        conversationId: string,
        userMessage: string,
        aiConfig: any,
    ) {
        try {
            // Emit typing indicator
            this.server.to(conversationId).emit('typing', {
                type: 'typing',
                isAI: true,
            });

            this.logger.log(`AI processing message in conversation ${conversationId}`);

            // Add delay based on config
            await new Promise((resolve) =>
                setTimeout(resolve, aiConfig.responseDelay || 1500),
            );

            // TODO: Get AI response from your AI service
            // const aiResponse = await this.aiService.generateResponse({
            //   message: userMessage,
            //   tone: aiConfig.tone,
            //   maxLength: aiConfig.maxResponseLength,
            //   confidenceThreshold: aiConfig.confidenceThreshold,
            // });

            // Mock AI response for demonstration
            const aiResponseText = this.generateMockAIResponse(userMessage, aiConfig.tone);

            // TODO: Save AI message to database
            // const aiMessage = await this.chatService.createMessage({
            //   conversationId: conversationId,
            //   content: aiResponseText,
            //   sender: 'ai',
            //   isAI: true,
            // });

            // Mock AI message
            const aiMessage = {
                _id: `msg_ai_${Date.now()}`,
                conversationId: conversationId,
                content: aiResponseText,
                sender: 'ai',
                isAI: true,
                createdAt: new Date(),
            };

            // Stop typing indicator
            this.server.to(conversationId).emit('stopTyping', {
                type: 'stopTyping',
                isAI: true,
            });

            // Send AI message
            this.server.to(conversationId).emit('message', {
                type: 'message',
                message: aiMessage,
            });

            this.logger.log(`AI response sent to conversation ${conversationId}`);
        } catch (error) {
            this.logger.error(`AI response error: ${error.message}`);
            this.server.to(conversationId).emit('stopTyping', {
                type: 'stopTyping',
                isAI: true,
            });
        }
    }

    private generateMockAIResponse(userMessage: string, tone: string): string {
        // Simple mock response generator
        const responses = {
            professional: 'Thank you for your inquiry. I will assist you with that request.',
            friendly: 'Hey there! 😊 I\'d be happy to help you with that!',
            casual: 'Sure thing! Let me help you out with that.',
            formal: 'I acknowledge your request and will provide assistance accordingly.',
        };

        return responses[tone] || responses.friendly;
    }

    // Public methods for external services to send messages

    /**
     * Send a message from support agent to a conversation
     */
    sendSupportMessage(conversationId: string, content: string, agentId: string) {
        const message = {
            _id: `msg_${Date.now()}`,
            conversationId: conversationId,
            content: content,
            sender: agentId,
            isAI: false,
            createdAt: new Date(),
        };

        this.server.to(conversationId).emit('message', {
            type: 'message',
            message: message,
        });

        this.logger.log(`Support message sent to conversation ${conversationId}`);
    }

    /**
     * Send typing indicator from support agent
     */
    sendTypingIndicator(conversationId: string, isAI: boolean = false) {
        this.server.to(conversationId).emit('typing', {
            type: 'typing',
            isAI,
        });
    }

    /**
     * Stop typing indicator
     */
    stopTypingIndicator(conversationId: string, isAI: boolean = false) {
        this.server.to(conversationId).emit('stopTyping', {
            type: 'stopTyping',
            isAI,
        });
    }

    /**
     * Update message status (delivered, seen, etc.)
     */
    updateMessageStatus(
        conversationId: string,
        messageId: string,
        status: 'sent' | 'delivered' | 'seen',
    ) {
        this.server.to(conversationId).emit('messageStatus', {
            type: 'messageStatus',
            messageId,
            status,
        });
    }

    /**
     * Get number of active connections for a conversation
     */
    getActiveConnectionsCount(conversationId: string): number {
        return this.conversationSockets.get(conversationId)?.size || 0;
    }

    /**
     * Check if a conversation has active connections
     */
    hasActiveConnections(conversationId: string): boolean {
        return this.getActiveConnectionsCount(conversationId) > 0;
    }
}
