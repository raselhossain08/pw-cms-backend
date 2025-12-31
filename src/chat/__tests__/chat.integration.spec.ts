import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as io from 'socket.io-client';
import { AppModule } from '../../app.module';
import { ChatGateway } from '../gateways/chat.gateway';
import { ChatService } from '../chat.service';
import { AIChatService } from '../services/ai-chat.service';
import { ChatLoggerService } from '../services/chat-logger.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('Chat Integration Tests', () => {
  let app: INestApplication;
  let chatGateway: ChatGateway;
  let chatService: ChatService;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();

    chatGateway = moduleFixture.get<ChatGateway>(ChatGateway);
    chatService = moduleFixture.get<ChatService>(ChatService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('WebSocket Connection', () => {
    it('should connect successfully with valid token', async () => {
      const token = jwtService.sign({ sub: 'test-user-id', username: 'testuser' });
      
      const socket = io.connect('http://localhost:3001/chat', {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
      });

      return new Promise<void>((resolve, reject) => {
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          socket.disconnect();
          resolve();
        });

        socket.on('connect_error', (error) => {
          reject(error);
        });

        socket.on('disconnect', () => {
          resolve();
        });
      });
    });

    it('should reject connection with invalid token', async () => {
      const socket = io.connect('http://localhost:3001/chat', {
        auth: { token: 'Bearer invalid-token' },
        transports: ['websocket'],
      });

      return new Promise<void>((resolve, reject) => {
        socket.on('connect_error', (error) => {
          expect(error.message).toContain('invalid');
          resolve();
        });

        socket.on('connect', () => {
          reject(new Error('Should not have connected with invalid token'));
        });
      });
    });
  });

  describe('Message Broadcasting', () => {
    let user1Socket: io.Socket;
    let user2Socket: io.Socket;
    let conversationId: string;

    beforeEach(async () => {
      // Create test conversation
      conversationId = 'test-conversation-' + Date.now();
      
      // Create test users and tokens
      const user1Token = jwtService.sign({ sub: 'user1-id', username: 'user1' });
      const user2Token = jwtService.sign({ sub: 'user2-id', username: 'user2' });

      // Connect both users
      user1Socket = io.connect('http://localhost:3001/chat', {
        auth: { token: `Bearer ${user1Token}` },
        transports: ['websocket'],
      });

      user2Socket = io.connect('http://localhost:3001/chat', {
        auth: { token: `Bearer ${user2Token}` },
        transports: ['websocket'],
      });

      // Wait for connections
      await new Promise<void>((resolve) => {
        user1Socket.on('connect', resolve);
      });
      await new Promise<void>((resolve) => {
        user2Socket.on('connect', resolve);
      });
    });

    afterEach(() => {
      user1Socket.disconnect();
      user2Socket.disconnect();
    });

    it('should broadcast messages to all users in conversation', async () => {
      // Join conversation with both users
      user1Socket.emit('join_conversation', { conversationId });
      user2Socket.emit('join_conversation', { conversationId });

      const messageContent = 'Test message ' + Date.now();
      
      return new Promise<void>((resolve) => {
        let messagesReceived = 0;

        user2Socket.on('new_message', (message) => {
          expect(message.content).toBe(messageContent);
          messagesReceived++;
          
          if (messagesReceived === 1) {
            resolve();
          }
        });

        // Send message from user1
        user1Socket.emit('send_message', {
          conversationId,
          content: messageContent,
        });
      });
    });

    it('should handle typing indicators', async () => {
      user1Socket.emit('join_conversation', { conversationId });
      user2Socket.emit('join_conversation', { conversationId });

      return new Promise<void>((resolve) => {
        user2Socket.on('user_typing', (data) => {
          expect(data.userId).toBe('user1-id');
          expect(data.conversationId).toBe(conversationId);
          expect(data.isTyping).toBe(true);
          resolve();
        });

        user1Socket.emit('typing_start', { conversationId });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid conversation access', async () => {
      const token = jwtService.sign({ sub: 'test-user', username: 'testuser' });
      const socket = io.connect('http://localhost:3001/chat', {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
      });

      return new Promise<void>((resolve) => {
        socket.on('connect', () => {
          socket.emit('join_conversation', { conversationId: 'invalid-conversation' }, (response) => {
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            socket.disconnect();
            resolve();
          });
        });
      });
    });
  });
});