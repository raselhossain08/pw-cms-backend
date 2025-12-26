import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { ChatType } from '../activity-logs/entities/chat-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(User.name) private userModel: Model<User>, // Add this for user lookup
    private activityLogsService: ActivityLogsService, // Add this
  ) {}

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
      // Validate userId is a valid ObjectId
      if (!Types.ObjectId.isValid(userId)) {
        console.error(`Invalid userId format: ${userId}`);
        return { conversations: [], total: 0 };
      }

      const userObjectId = new Types.ObjectId(userId);

      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find({ participants: userObjectId })
          .populate('participants', 'firstName lastName avatar')
          .populate('lastMessage')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.conversationModel.countDocuments({ participants: userObjectId }),
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
    const conversation = await this.conversationModel
      .findOne({ _id: conversationId, participants: userId })
      .populate('participants', 'firstName lastName avatar')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
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
    const sender = await this.userModel.findById(userId).lean().exec();
    const senderName = sender
      ? `${sender.firstName} ${sender.lastName}`
      : 'Unknown';

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

    // Get receiver info if it's a 1-on-1 chat
    let receiverName: string | undefined;
    if (conversation && (conversation.participants as any[]).length === 2) {
      const receiver = (conversation.participants as any[]).find(
        (p: any) => p._id.toString() !== userId,
      );
      receiverName = receiver
        ? `${receiver.firstName} ${receiver.lastName}`
        : undefined;
    }

    // Log chat message
    await this.activityLogsService
      .createChatLog({
        chatType: chatType,
        senderId: new Types.ObjectId(userId),
        senderName: senderName,
        receiverId: conversation
          ? (conversation.participants as any[])?.find(
              (p: any) => p._id.toString() !== userId,
            )?._id
          : undefined,
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
    const populatedMessage = await this.messageModel
      .findById(savedMessage._id)
      .populate('sender', 'firstName lastName avatar')
      .exec();

    return populatedMessage!;
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

      // Validate ObjectId formats
      if (!Types.ObjectId.isValid(conversationId)) {
        console.log(`Invalid conversationId format: ${conversationId}`);
        return false;
      }

      if (!Types.ObjectId.isValid(userId)) {
        console.log(`Invalid userId format: ${userId}`);
        return false;
      }

      const userObjectId = new Types.ObjectId(userId);
      const conversationObjectId = new Types.ObjectId(conversationId);

      const conversation = await this.conversationModel
        .findOne({
          _id: conversationObjectId,
          participants: userObjectId,
        })
        .lean()
        .exec();

      if (!conversation) {
        console.log(
          `Access denied: User ${userId} tried to access conversation ${conversationId}`,
        );
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
    createMessageDto: CreateMessageDto & { sender: string },
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
    const populatedMessage = await this.messageModel
      .findById(savedMessage._id)
      .populate('sender', 'firstName lastName avatar')
      .exec();

    return populatedMessage!;
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
}
