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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications.service';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
@UseGuards(WsJwtGuard)
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token.replace('Bearer ', ''), {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = payload.sub;
      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;

      // Join user to their personal room
      client.join(`user_${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      this.logger.log(`Total connected users: ${this.connectedUsers.size}`);

      // Send unread count on connection
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
      this.logger.log(`Total connected users: ${this.connectedUsers.size}`);
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    try {
      const userId = client.data.userId;
      await this.notificationsService.markAsRead(data.notificationId, userId);

      // Update unread count
      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark as read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      await this.notificationsService.markAllAsRead(userId);

      const unreadCount =
        await this.notificationsService.getUnreadCount(userId);
      client.emit('unread_count', { count: unreadCount });

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark all read error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number; limit?: number },
  ) {
    try {
      const userId = client.data.userId;
      const { notifications, total } =
        await this.notificationsService.getUserNotifications(
          userId,
          data.page,
          data.limit,
        );

      return { success: true, notifications, total };
    } catch (error) {
      this.logger.error(`Get notifications error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Methods to send notifications to specific users
  async sendToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  async sendToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  async sendNotificationToUser(userId: string, notification: any) {
    await this.sendToUser(userId, 'new_notification', notification);

    // Update unread count
    const unreadCount = await this.notificationsService.getUnreadCount(userId);
    await this.sendToUser(userId, 'unread_count', { count: unreadCount });
  }

  async sendToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Admin methods
  async sendAdminAlert(message: string, data?: any) {
    // Send to all admin users
    this.connectedUsers.forEach((socketId, userId) => {
      // In a real app, you'd check if user is admin
      this.server
        .to(socketId)
        .emit('admin_alert', { message, data, timestamp: new Date() });
    });
  }
}
