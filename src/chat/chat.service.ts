import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateSupportConversationDto } from './dto/create-support-conversation.dto';
import { ChatLoggerService } from './services/chat-logger.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ChatType } from '../activity-logs/entities/chat-log.entity';
import { User } from '../users/entities/user.entity';
import { AIChatService } from './services/ai-chat.service';
import { Response } from 'express';
import { Server } from 'socket.io';

@Injectable()
export class ChatService {
  private sseClients = new Map<string, Response>();
  private socketServer: Server | null = null;

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(User.name) private userModel: Model<User>,
    private activityLogsService: ActivityLogsService,
    private chatLoggerService: ChatLoggerService,
    private aiChatService: AIChatService,
  ) {}

  setSocketServer(server: Server): void {
    this.socketServer = server;
  }

  async createConversation(
    createConversationDto: CreateConversationDto,
    userId: string,
  ): Promise<Conversation> {
    const conversation = new this.conversationModel({
      ...createConversationDto,
      createdBy: userId,
    });
    return await conversation.save();
  }

  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const skip = (page - 1) * limit;

    try {
      let userQuery: any;

      // Handle guest user IDs (strings) vs regular user IDs (ObjectIds)
      if (userId.startsWith('guest_')) {
        // For guest users, use the string directly
        userQuery = userId;
      } else {
        // For regular users, validate ObjectId format and convert
        if (!Types.ObjectId.isValid(userId)) {
          console.error(`Invalid userId format: ${userId}`);
          return { conversations: [], total: 0 };
        }
        userQuery = new Types.ObjectId(userId);
      }

      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find({ participants: userQuery })
          .populate('participants', 'firstName lastName avatar')
          .populate('lastMessage')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.conversationModel.countDocuments({ participants: userQuery }),
      ]);

      // Filter out conversations with invalid/missing data
      const validConversations = conversations.filter((conv) => {
        // Ensure participants array exists and is not empty
        if (
          !conv.participants ||
          !Array.isArray(conv.participants) ||
          conv.participants.length === 0
        ) {
          console.log(
            `Removing conversation ${conv._id} - invalid participants array`,
          );
          return false;
        }

        // Ensure user is actually in the participants array (double-check)
        const participantIds = conv.participants.map((p: any) =>
          typeof p === 'object' && p._id ? p._id.toString() : p.toString(),
        );

        if (!participantIds.includes(userId)) {
          console.log(
            `Removing conversation ${conv._id} - user not in participants`,
          );
          return false;
        }

        return true;
      });

      return {
        conversations: validConversations as any[],
        total: validConversations.length,
      };
    } catch (error) {
      console.error(
        `Error fetching user conversations: ${error.message}`,
        error,
      );
      return { conversations: [], total: 0 };
    }
  }

  async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    let userQuery: any = userId;
    if (!userId.startsWith('guest_') && Types.ObjectId.isValid(userId)) {
      userQuery = new Types.ObjectId(userId);
    }

    const conversation = await this.conversationModel
      .findOne({ _id: conversationId, participants: userQuery })
      .populate('participants', 'firstName lastName avatar')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  // Get all support conversations (guest user conversations) for admin/support dashboard
  async getAllSupportConversations(
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    // Query for conversations where participants include guest users
    const query = {
      participants: { $elemMatch: { $regex: /^guest_/i } },
    };

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'firstName lastName avatar email')
        .lean()
        .exec(),
      this.conversationModel.countDocuments(query).exec(),
    ]);

    // For each conversation, get the last message and format participant info
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await this.messageModel
          .findOne({ conversation: conv._id })
          .sort({ createdAt: -1 })
          .lean()
          .exec();

        // Create a formatted participant object for guest users using stored userName/userEmail
        const formattedParticipants = (conv.participants as any[]).map((p) => {
          if (typeof p === 'string' && p.startsWith('guest_')) {
            // For guest users, use the stored userName and userEmail from conversation
            return {
              _id: p,
              firstName: conv.userName || 'Unknown',
              lastName: '', // Guest users typically have full name in firstName
              email: conv.userEmail || '',
              avatar: '',
            };
          }
          return p; // Return populated user object as-is
        });

        // Log for debugging
        console.log('Support conversation:', {
          id: conv._id,
          userName: conv.userName,
          userEmail: conv.userEmail,
          isSupport: conv.isSupport,
          participants: formattedParticipants,
        });

        return {
          ...conv,
          participants: formattedParticipants,
          lastMessage,
          // Ensure these fields are explicitly included
          userName: conv.userName,
          userEmail: conv.userEmail,
          isSupport: conv.isSupport,
        };
      }),
    );

    return {
      conversations: conversationsWithLastMessage,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async sendMessage(
    conversationId: string,
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    const canAccess = await this.canUserAccessConversation(
      conversationId,
      userId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Cannot access this conversation');
    }

    const message = new this.messageModel({
      ...createMessageDto,
      conversation: conversationId,
      sender: userId,
    });
    const savedMessage = await message.save();

    // Get conversation to determine chat type
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'firstName lastName')
      .lean()
      .exec();

    // Get sender info
    let senderName = 'Unknown';
    if (userId.startsWith('guest_')) {
      senderName = 'Guest User';
    } else if (Types.ObjectId.isValid(userId)) {
      const sender = await this.userModel.findById(userId).lean().exec();
      senderName = sender
        ? `${sender.firstName} ${sender.lastName}`
        : 'Unknown';
    }

    // Determine chat type
    let chatType = ChatType.USER_TO_USER;
    if (conversation) {
      const participants = (conversation.participants as any[]) || [];
      if (participants.length === 2) {
        chatType = ChatType.USER_TO_USER;
      } else if (participants.length > 2) {
        chatType = ChatType.GROUP_CHAT;
      }
      // You can add more logic to determine other chat types
    }

    // Helper to get ID from participant (object or string)
    const getParticipantId = (p: any): string => {
      if (typeof p === 'string') return p;
      if (p && p._id) return p._id.toString();
      return '';
    };

    // Helper to get Name from participant (object or string)
    const getParticipantName = (p: any): string => {
      if (typeof p === 'string')
        return p.startsWith('guest_') ? 'Guest User' : 'Unknown';
      if (p && p.firstName) return `${p.firstName} ${p.lastName}`;
      return 'Unknown';
    };

    // Get receiver info
    let receiverName: string | undefined;
    let receiverId: string | undefined;

    if (conversation) {
      const participants = (conversation.participants as any[]) || [];
      const otherParticipant = participants.find(
        (p: any) => getParticipantId(p) !== userId,
      );

      if (otherParticipant) {
        receiverId = getParticipantId(otherParticipant);
        // Only set receiver name for 1-on-1 chats
        if (participants.length === 2) {
          receiverName = getParticipantName(otherParticipant);
        }
      }
    }

    // Log chat message
    await this.activityLogsService
      .createChatLog({
        chatType: chatType,
        senderId: userId,
        senderName: senderName,
        receiverId: receiverId,
        receiverName: receiverName,
        conversationId: conversationId,
        message: createMessageDto.content || '',
        isRead: false,
      })
      .catch((err) => console.error('Failed to log chat message:', err));

    // Update conversation's last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: savedMessage._id,
    });

    // Populate sender info
    const messageQuery = this.messageModel.findById(savedMessage._id);

    if (!userId.startsWith('guest_')) {
      messageQuery.populate('sender', 'firstName lastName avatar');
    }

    const populatedMessage = await messageQuery.exec();

    // Broadcast user message to SSE clients
    this.broadcastToConversation(
      conversationId,
      'new_message',
      populatedMessage,
    );

    // Generate AI response if enabled
    if (createMessageDto.aiConfig?.enabled) {
      console.log('AI is enabled, generating response...');
      // Send AI typing indicator
      this.broadcastToConversation(conversationId, 'ai_typing_start', {
        conversationId,
      });

      // Generate AI response asynchronously
      this.generateAndSendAIResponse(
        conversationId,
        createMessageDto.content,
        createMessageDto.aiConfig,
      ).catch((error) => {
        console.error('Failed to generate AI response:', error);
        // Stop typing indicator on error
        this.broadcastToConversation(conversationId, 'ai_typing_stop', {
          conversationId,
        });
      });
    } else {
      console.log('AI is not enabled or aiConfig missing');
    }

    return populatedMessage!;
  }

  private async generateAndSendAIResponse(
    conversationId: string,
    userMessage: string,
    aiConfig: any,
  ): Promise<void> {
    console.log(
      'Starting AI response generation for conversation:',
      conversationId,
    );
    console.log('AI Config:', JSON.stringify(aiConfig));
    try {
      // Get recent conversation history
      const recentMessages = await this.messageModel
        .find({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .exec();

      console.log(`Found ${recentMessages.length} recent messages`);

      const conversationHistory = recentMessages.reverse().map((msg) => ({
        role: msg.sender === 'ai-assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      console.log('Conversation history:', JSON.stringify(conversationHistory));

      // Generate AI response
      console.log('Calling aiChatService.generateAIResponse...');
      const aiResponse = await this.aiChatService.generateAIResponse(
        userMessage,
        conversationHistory,
        aiConfig,
      );

      console.log(
        'AI Response received:',
        aiResponse ? JSON.stringify(aiResponse) : 'null',
      );

      if (aiResponse && aiResponse.content) {
        console.log('AI response has content, creating message...');
        // Create AI message
        const aiMessage = new this.messageModel({
          content: aiResponse.content,
          conversation: conversationId,
          sender: 'ai-assistant',
          type: 'text',
        });
        const savedAIMessage = await aiMessage.save();

        // Convert to plain object with proper structure
        const messageToSend = {
          _id: (savedAIMessage._id as Types.ObjectId).toString(),
          conversation: conversationId,
          sender: 'ai-assistant',
          content: savedAIMessage.content,
          type: savedAIMessage.type,
          createdAt:
            (savedAIMessage as any).createdAt || new Date().toISOString(),
        };

        console.log('[AI] Sending message to frontend:', messageToSend);

        // Stop typing indicator
        this.broadcastToConversation(conversationId, 'ai_typing_stop', {
          conversationId,
        });

        // Broadcast AI message (send the message directly, not wrapped)
        this.broadcastToConversation(
          conversationId,
          'new_message',
          messageToSend,
        );

        // Update conversation's last message
        await this.conversationModel.findByIdAndUpdate(conversationId, {
          lastMessage: savedAIMessage._id,
        });
      } else {
        // No AI response generated, stop typing indicator
        console.log(
          'No AI response generated - aiResponse is null or has no content',
        );
        this.broadcastToConversation(conversationId, 'ai_typing_stop', {
          conversationId,
        });
      }
    } catch (error) {
      console.error('AI response generation failed:', error);
      // Stop typing indicator on error
      this.broadcastToConversation(conversationId, 'ai_typing_stop', {
        conversationId,
      });
    }
  }

  registerSSEClient(conversationId: string, res: Response): void {
    this.sseClients.set(conversationId, res);
  }

  unregisterSSEClient(conversationId: string): void {
    this.sseClients.delete(conversationId);
  }

  private broadcastToConversation(
    conversationId: string,
    event: string,
    data: any,
  ): void {
    // Try Socket.IO first (preferred method)
    if (this.socketServer) {
      try {
        this.socketServer
          .to(`conversation_${conversationId}`)
          .emit(event, data);
        console.log(
          `[Socket.IO] Successfully broadcast ${event} to conversation ${conversationId}`,
        );
        return;
      } catch (error) {
        console.error('[Socket.IO] Failed to broadcast:', error);
      }
    }

    // Fallback to SSE if Socket.IO is not available
    const client = this.sseClients.get(conversationId);
    console.log(
      `[SSE] Broadcasting ${event} to conversation ${conversationId}, client exists: ${!!client}`,
    );
    if (client && !client.writableEnded) {
      try {
        const eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        client.write(eventData);
        console.log(
          `[SSE] Successfully broadcast ${event} to conversation ${conversationId}`,
        );
      } catch (error) {
        console.error('[SSE] Failed to broadcast to SSE client:', error);
        this.sseClients.delete(conversationId);
      }
    } else {
      console.log(
        `[SSE] No active SSE client for conversation ${conversationId}`,
      );
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    const canAccess = await this.canUserAccessConversation(
      conversationId,
      userId,
    );
    if (!canAccess) {
      throw new ForbiddenException('Cannot access this conversation');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversation: conversationId })
        .populate('sender', 'firstName lastName avatar')
        .populate('replyTo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ conversation: conversationId }),
    ]);

    return { messages: messages.reverse(), total };
  }

  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: userId } },
        { new: true },
      )
      .populate('sender', 'firstName lastName avatar');

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async sendTypingIndicator(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    // Implementation for typing indicator
    // This would typically broadcast a typing event to other participants
    console.log(`User ${userId} is typing in conversation ${conversationId}`);
    // You would add SSE/WebSocket broadcasting here
  }

  async joinConversation(conversationId: string, userId: string): Promise<any> {
    // Implementation for joining conversation
    // This would typically add the user to the conversation participants
    // and broadcast a join event

    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is already a participant
    if (!conversation.participants.includes(userId as any)) {
      conversation.participants.push(userId as any);
      await conversation.save();
    }

    // Get conversation details with messages
    const messages = await this.messageModel
      .find({ conversation: conversationId })
      .populate('sender', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    return {
      success: true,
      conversation,
      messages: messages.reverse(),
    };
  }

  async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // If there are only 2 participants, delete the entire conversation
    if (conversation.participants.length === 2) {
      await Promise.all([
        this.conversationModel.findByIdAndDelete(conversationId),
        this.messageModel.deleteMany({ conversation: conversationId }),
      ]);
    } else {
      // Otherwise, just remove the user from participants
      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $pull: { participants: userId },
      });
    }
  }

  async leaveConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      $pull: { participants: userId },
    });
  }

  async canUserAccessConversation(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Validate input parameters
      if (!conversationId || !userId) {
        console.log('Invalid parameters: conversationId or userId is missing');
        return false;
      }

      // Validate conversationId format (must be ObjectId)
      if (!Types.ObjectId.isValid(conversationId)) {
        console.log(`Invalid conversationId format: ${conversationId}`);
        return false;
      }

      const conversationObjectId = new Types.ObjectId(conversationId);

      // First, get the conversation to check if it's a support/guest conversation
      const conversation = await this.conversationModel
        .findById(conversationObjectId)
        .lean()
        .exec();

      if (!conversation) {
        console.log(`Conversation not found: ${conversationId}`);
        return false;
      }

      // Additional validation: ensure conversation has valid participants
      if (
        !conversation.participants ||
        !Array.isArray(conversation.participants) ||
        conversation.participants.length === 0
      ) {
        console.log(
          `Invalid conversation ${conversationId}: no valid participants`,
        );
        return false;
      }

      // Check if this is a support conversation (has guest user)
      const hasGuestUser = conversation.participants.some((p) =>
        String(p).startsWith('guest_'),
      );

      // If it's a support conversation and user is NOT a guest, allow access
      // This allows admin/support users to access all guest conversations
      if (hasGuestUser && !userId.startsWith('guest_')) {
        console.log(
          `Admin/Support user ${userId} accessing support conversation ${conversationId}`,
        );
        return true;
      }

      // For regular conversations or guest users, check if userId is in participants
      const query: any = { _id: conversationObjectId };

      if (userId.startsWith('guest_')) {
        // For guest users, check if the userId string is in participants array
        query.participants = { $in: [userId] };
      } else {
        // For regular users, validate ObjectId format and convert
        if (!Types.ObjectId.isValid(userId)) {
          console.log(`Invalid userId format: ${userId}`);
          return false;
        }
        const userObjectId = new Types.ObjectId(userId);
        query.participants = { $in: [userObjectId] };
      }

      const conversationCheck = await this.conversationModel
        .findOne(query)
        .lean()
        .exec();

      if (!conversationCheck) {
        console.log(
          `Access denied: User ${userId} tried to access conversation ${conversationId}`,
        );
        console.log(`Query used: ${JSON.stringify(query)}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        `Error checking conversation access for conversation ${conversationId}, user ${userId}: ${error.message}`,
        error,
      );
      return false;
    }
  }

  async createMessage(
    createMessageDto: CreateMessageDto & {
      sender: string;
      conversation: string;
    },
  ): Promise<Message> {
    // Verify user can access conversation
    const canAccess = await this.canUserAccessConversation(
      createMessageDto.conversation,
      createMessageDto.sender,
    );
    if (!canAccess) {
      throw new ForbiddenException('Cannot access this conversation');
    }

    const message = new this.messageModel(createMessageDto);
    const savedMessage = await message.save();

    // Update conversation's last message
    await this.conversationModel.findByIdAndUpdate(
      createMessageDto.conversation,
      {
        lastMessage: savedMessage._id,
      },
    );

    // Populate sender info
    const messageQuery = this.messageModel.findById(savedMessage._id);

    if (
      createMessageDto.sender &&
      !createMessageDto.sender.startsWith('guest_') &&
      createMessageDto.sender !== 'ai-assistant'
    ) {
      messageQuery.populate('sender', 'firstName lastName avatar');
    }

    const populatedMessage = await messageQuery.exec();

    return populatedMessage!;
  }

  async detectSpam(
    content: string,
    userId: string,
  ): Promise<{ isSpam: boolean; reason?: string }> {
    // 1. Content moderation (Basic blacklist)
    const blacklist = ['spam', 'abuse', 'badword', 'viagra', 'casino']; // Add more real words in production
    const lowerContent = content.toLowerCase();
    if (blacklist.some((word) => lowerContent.includes(word))) {
      return { isSpam: true, reason: 'Message contains prohibited content' };
    }

    // 2. Rate limiting (Max 10 messages per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMessageCount = await this.messageModel.countDocuments({
      sender: userId,
      createdAt: { $gte: oneMinuteAgo },
    });

    if (recentMessageCount >= 10) {
      return {
        isSpam: true,
        reason: 'You are sending messages too quickly. Please wait a moment.',
      };
    }

    // 3. Repetition check (Check last 3 messages)
    const lastMessages = await this.messageModel
      .find({
        sender: userId,
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('content');

    if (lastMessages.length > 0) {
      const allIdentical = lastMessages.every((msg) => msg.content === content);
      if (allIdentical && lastMessages.length === 3) {
        return {
          isSpam: true,
          reason: 'Please do not repeat the same message.',
        };
      }
    }

    return { isSpam: false };
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: Message[]; total: number }> {
    return this.getMessages(conversationId, userId, page, limit);
  }

  async markMessagesAsRead(
    messageIds: string[],
    userId: string,
  ): Promise<void> {
    await this.messageModel.updateMany(
      {
        _id: { $in: messageIds.map((id) => new Types.ObjectId(id)) },
        readBy: { $ne: userId },
      },
      {
        $addToSet: { readBy: new Types.ObjectId(userId) },
      },
    );
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    await this.messageModel.findByIdAndDelete(messageId);
  }

  async updateMessage(
    messageId: string,
    content: string,
    userId: string,
  ): Promise<Message> {
    const message = await this.messageModel.findById(messageId);

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.sender.toString() !== userId) {
      throw new ForbiddenException('Can only update your own messages');
    }

    message.content = content;
    message.isEdited = true;
    const updatedMessage = await message.save();

    // Populate sender info
    const populatedMessage = await this.messageModel
      .findById(updatedMessage._id)
      .populate('sender', 'firstName lastName avatar')
      .exec();

    return populatedMessage!;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const conversations = await this.conversationModel.find({
      participants: userId,
    });
    const conversationIds = conversations.map((conv) => conv._id);

    const unreadCount = await this.messageModel.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      readBy: { $ne: userId },
    });

    return unreadCount;
  }

  async countMessages(filter: any = {}): Promise<number> {
    return await this.messageModel.countDocuments(filter);
  }

  async countConversations(filter: any = {}): Promise<number> {
    return await this.conversationModel.countDocuments(filter);
  }

  async getActiveUsers(filter: any = {}): Promise<any[]> {
    return await this.messageModel.distinct('sender', filter);
  }

  async getFileUploads(filter: any = {}): Promise<any[]> {
    const messages = await this.messageModel.find({
      ...filter,
      type: { $in: ['file', 'image', 'audio', 'video'] },
    });

    return messages.map((msg) => ({
      ...msg.toObject(),
      fileType: msg.metadata?.mimeType || msg.type,
      fileSize: msg.metadata?.fileSize || 0,
    }));
  }

  async getUserActivity(filter: any = {}): Promise<any[]> {
    return await this.messageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sender' },
        },
      },
      {
        $project: {
          date: '$_id',
          count: '$count', // Renamed from messages to count for compatibility with formatChartData
          activeUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { date: 1 } },
    ]);
  }

  async getResponseTimes(filter: any = {}): Promise<any[]> {
    // Placeholder: In a real app, this would calculate time between user message and agent response
    return [];
  }

  async getChatSessions(filter: any = {}): Promise<any[]> {
    const conversations = await this.conversationModel.find(filter).lean();
    // For performance, we're not counting messages per conversation here
    // In a production app, this should be pre-calculated or stored in the conversation document
    return conversations.map((c: any) => ({
      duration: c.updatedAt
        ? new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()
        : 0,
      messageCount: 0,
    }));
  }

  async getMessageVolume(filter: any = {}): Promise<any[]> {
    return await this.messageModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async getFeedbackRatings(filter: any = {}): Promise<any[]> {
    // Placeholder - should return array of objects with 'rating' property
    return [];
  }

  /**
   * Get real-time monitoring statistics for chat dashboard
   */
  async getMonitoringStats(): Promise<any> {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Get active support conversations (last activity within 30 minutes)
    const activeConversations = await this.conversationModel.countDocuments({
      isSupport: true,
      updatedAt: { $gte: thirtyMinutesAgo },
    });

    // Get waiting conversations (no messages from admin/agent yet)
    const waitingConversations = await this.conversationModel.find({
      isSupport: true,
      updatedAt: { $gte: thirtyMinutesAgo },
    });

    let waitingUsers = 0;
    for (const conv of waitingConversations) {
      const messages = await this.messageModel
        .find({
          conversation: conv._id,
        })
        .limit(10);

      // Check if any message is from an admin (non-guest user)
      const hasAdminResponse = messages.some(
        (msg) => !String(msg.sender).startsWith('guest_'),
      );

      if (!hasAdminResponse) {
        waitingUsers++;
      }
    }

    // Calculate average wait time (time from conversation creation to first admin response)
    const recentConversations = (await this.conversationModel
      .find({
        isSupport: true,
        createdAt: { $gte: thirtyMinutesAgo },
      })
      .lean()) as any[];

    let totalWaitTime = 0;
    let conversationsWithResponse = 0;

    for (const conv of recentConversations) {
      const messages = (await this.messageModel
        .find({ conversation: conv._id })
        .sort({ createdAt: 1 })
        .lean()) as any[];

      const firstAdminMessage = messages.find(
        (msg) => !String(msg.sender).startsWith('guest_'),
      );

      if (firstAdminMessage) {
        const waitTime =
          new Date(firstAdminMessage.createdAt).getTime() -
          new Date(conv.createdAt).getTime();
        totalWaitTime += waitTime;
        conversationsWithResponse++;
      }
    }

    const averageWaitTime =
      conversationsWithResponse > 0
        ? Math.floor(totalWaitTime / conversationsWithResponse / 1000)
        : 0;

    // Get response time distribution
    const responseTimes = {
      immediate: 0,
      within1Min: 0,
      within5Min: 0,
      within30Min: 0,
      over30Min: 0,
    };

    for (const conv of recentConversations) {
      const messages = (await this.messageModel
        .find({ conversation: conv._id })
        .sort({ createdAt: 1 })
        .lean()) as any[];

      const firstAdminMessage = messages.find(
        (msg) => !String(msg.sender).startsWith('guest_'),
      );

      if (firstAdminMessage) {
        const responseTime =
          (new Date(firstAdminMessage.createdAt).getTime() -
            new Date(conv.createdAt).getTime()) /
          1000;

        if (responseTime < 30) responseTimes.immediate++;
        else if (responseTime < 60) responseTimes.within1Min++;
        else if (responseTime < 300) responseTimes.within5Min++;
        else if (responseTime < 1800) responseTimes.within30Min++;
        else responseTimes.over30Min++;
      }
    }

    // Convert to percentages
    const total = Object.values(responseTimes).reduce((a, b) => a + b, 0);
    if (total > 0) {
      Object.keys(responseTimes).forEach((key) => {
        responseTimes[key] = Math.round((responseTimes[key] / total) * 100);
      });
    }

    return {
      activeConversations,
      waitingUsers,
      onlineAgents: 2, // TODO: Implement actual online agent tracking
      queueLength: waitingUsers,
      averageWaitTime,
      responseTimes,
      performanceMetrics: {
        firstResponseTime: averageWaitTime,
        resolutionTime: 3600, // TODO: Calculate actual resolution time
        agentPerformance: [], // TODO: Implement agent performance tracking
      },
    };
  }

  /**
   * Get active chat sessions for monitoring
   */
  async getActiveSessions(): Promise<any[]> {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const conversations = (await this.conversationModel
      .find({
        isSupport: true,
        updatedAt: { $gte: thirtyMinutesAgo },
      })
      .sort({ updatedAt: -1 })
      .lean()) as any[];

    const sessions: any[] = [];

    for (const conv of conversations) {
      const lastMessage = (await this.messageModel
        .findOne({ conversation: conv._id })
        .sort({ createdAt: -1 })
        .lean()) as any;

      const messages = (await this.messageModel
        .find({ conversation: conv._id })
        .sort({ createdAt: 1 })
        .lean()) as any[];

      const hasAdminResponse = messages.some(
        (msg) => !String(msg.sender).startsWith('guest_'),
      );

      const firstAdminMessage = messages.find(
        (msg) => !String(msg.sender).startsWith('guest_'),
      );

      const waitTime = firstAdminMessage
        ? Math.floor(
            (new Date(firstAdminMessage.createdAt).getTime() -
              new Date(conv.createdAt).getTime()) /
              1000,
          )
        : Math.floor(
            (now.getTime() - new Date(conv.createdAt).getTime()) / 1000,
          );

      const status =
        conv.supportStatus === 'resolved'
          ? 'resolved'
          : hasAdminResponse
            ? 'active'
            : 'waiting';

      sessions.push({
        id: conv._id.toString(),
        userName: conv.userName || 'Unknown',
        userEmail: conv.userEmail || '',
        startedAt: conv.createdAt,
        lastMessage: lastMessage?.content || '',
        waitTime,
        status,
        agentId: conv.assignedAgent?.toString(),
      });
    }

    return sessions;
  }

  /**
   * Assign an agent to a support conversation
   */
  async assignAgent(
    conversationId: string,
    agentId: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.assignedAgent = new Types.ObjectId(agentId);
    conversation.supportStatus = 'active';
    await conversation.save();

    return conversation;
  }

  /**
   * Mark a support conversation as resolved
   */
  async markResolved(
    conversationId: string,
    resolvedBy: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.supportStatus = 'resolved';
    conversation.resolvedAt = new Date();
    await conversation.save();

    // Log the resolution
    await this.activityLogsService.createChatLog({
      senderId: resolvedBy,
      senderName: 'Support Agent',
      conversationId,
      message: 'Conversation resolved',
      chatType: ChatType.USER_TO_SUPPORT,
      metadata: {
        action: 'resolved',
        resolvedAt: new Date(),
      },
    });

    return conversation;
  }

  /**
   * Cleanup utility: Remove invalid conversations and orphaned messages
   * Call this periodically or when access issues are detected
   */
  async cleanupInvalidConversations(): Promise<{
    deletedConversations: number;
    deletedMessages: number;
  }> {
    try {
      // Find conversations with empty or invalid participants
      const invalidConversations = await this.conversationModel
        .find({
          $or: [
            { participants: { $exists: false } },
            { participants: { $size: 0 } },
            { participants: null },
          ],
        })
        .lean()
        .exec();

      const invalidConvIds = invalidConversations.map((c) => c._id);

      // Delete messages from invalid conversations
      const deletedMessages = await this.messageModel.deleteMany({
        conversation: { $in: invalidConvIds },
      });

      // Delete invalid conversations
      const deletedConversations = await this.conversationModel.deleteMany({
        _id: { $in: invalidConvIds },
      });

      console.log(
        `Cleanup completed: ${deletedConversations.deletedCount} conversations and ${deletedMessages.deletedCount} messages removed`,
      );

      return {
        deletedConversations: deletedConversations.deletedCount || 0,
        deletedMessages: deletedMessages.deletedCount || 0,
      };
    } catch (error) {
      console.error(`Cleanup error: ${error.message}`, error);
      return { deletedConversations: 0, deletedMessages: 0 };
    }
  }

  /**
   * Archive or unarchive a conversation for a specific user
   */
  async archiveConversation(
    conversationId: string,
    userId: string,
    archived: boolean,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = new Types.ObjectId(userId);

    if (archived) {
      // Add user to archivedBy array if not already present
      if (!conversation.archivedBy) {
        conversation.archivedBy = [];
      }
      const isAlreadyArchived = conversation.archivedBy.some(
        (id) => id.toString() === userId,
      );
      if (!isAlreadyArchived) {
        conversation.archivedBy.push(userObjectId);
      }
    } else {
      // Remove user from archivedBy array
      if (conversation.archivedBy) {
        conversation.archivedBy = conversation.archivedBy.filter(
          (id) => id.toString() !== userId,
        );
      }
    }

    // Update global archived status if all participants archived
    conversation.archived =
      conversation.archivedBy &&
      conversation.archivedBy.length === conversation.participants.length;

    return await conversation.save();
  }

  /**
   * Star or unstar a conversation for a specific user
   */
  async starConversation(
    conversationId: string,
    userId: string,
    starred: boolean,
  ): Promise<Conversation> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const userObjectId = new Types.ObjectId(userId);

    if (starred) {
      // Add user to starredBy array if not already present
      if (!conversation.starredBy) {
        conversation.starredBy = [];
      }
      const isAlreadyStarred = conversation.starredBy.some(
        (id) => id.toString() === userId,
      );
      if (!isAlreadyStarred) {
        conversation.starredBy.push(userObjectId);
      }
    } else {
      // Remove user from starredBy array
      if (conversation.starredBy) {
        conversation.starredBy = conversation.starredBy.filter(
          (id) => id.toString() !== userId,
        );
      }
    }

    // Update global starred status if any participant starred
    conversation.starred =
      conversation.starredBy && conversation.starredBy.length > 0;

    return await conversation.save();
  }

  async createSupportConversation(
    createSupportConversationDto: CreateSupportConversationDto,
    userId: string,
  ): Promise<Conversation> {
    // For guest users, validate email and name
    if (userId.startsWith('guest_')) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (
        !createSupportConversationDto.email ||
        !emailRegex.test(createSupportConversationDto.email)
      ) {
        throw new BadRequestException('Invalid email format');
      }

      // Validate name length
      if (
        !createSupportConversationDto.name ||
        createSupportConversationDto.name.length < 2
      ) {
        throw new BadRequestException(
          'Name must be at least 2 characters long',
        );
      }
    }

    // Create support conversation
    const conversation = new this.conversationModel({
      title: `Support - ${createSupportConversationDto.name || 'User'}`,
      participants: [userId],
      createdBy: userId,
      isSupport: true,
      userEmail: createSupportConversationDto.email,
      userName: createSupportConversationDto.name,
      supportCategory: createSupportConversationDto.category || 'general',
      courseId: createSupportConversationDto.courseId,
    });

    const savedConversation = await conversation.save();

    // Create initial message if provided
    if (createSupportConversationDto.message) {
      const message = new this.messageModel({
        conversation: savedConversation._id,
        sender: userId,
        content: createSupportConversationDto.message,
        type: 'text',
      });
      await message.save();

      // Update conversation with last message
      const conversationDoc = savedConversation as any;
      conversationDoc.lastMessage = message._id;
      await conversationDoc.save();
    }

    // Log the support conversation creation
    await this.chatLoggerService.logMessage(
      (savedConversation as any)._id.toString(),
      `support-conversation-${Date.now()}`,
      userId,
      'user',
      'Support conversation created',
      'support_conversation_created',
      {
        userName: createSupportConversationDto.name,
        userEmail: createSupportConversationDto.email,
        category: createSupportConversationDto.category,
        courseId: createSupportConversationDto.courseId,
      },
    );

    return savedConversation;
  }

  async getUserById(userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        return null;
      }
      return await this.userModel
        .findById(userId)
        .select('firstName lastName email')
        .lean()
        .exec();
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  async handleFileUpload(fileData: {
    conversationId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    userId: string;
  }) {
    // Validate conversation access
    const conversation = await this.conversationModel.findById(
      fileData.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === fileData.userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    // Validate file size (max 10MB)
    if (fileData.fileSize > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(fileData.fileType)) {
      throw new BadRequestException('File type not supported');
    }

    // Create file message
    const message = new this.messageModel({
      conversation: fileData.conversationId,
      sender: fileData.userId,
      content: `📎 ${fileData.fileName}`,
      type: 'file',
      metadata: {
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        uploadedAt: new Date(),
      },
    });

    await message.save();

    // Update conversation last message
    await this.conversationModel.findByIdAndUpdate(fileData.conversationId, {
      lastMessage: message._id,
    });

    // Log file upload
    await this.chatLoggerService.logMessage(
      fileData.conversationId,
      (message._id as Types.ObjectId).toString(),
      fileData.userId,
      'user',
      `File uploaded: ${fileData.fileName}`,
      'file_upload',
      {
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
      },
    );

    return {
      success: true,
      message: {
        _id: message._id,
        content: message.content,
        type: message.type,
        metadata: message.metadata,
        createdAt: (message as any).createdAt,
      },
    };
  }
}
