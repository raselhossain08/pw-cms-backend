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

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
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

    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find({ participants: userId })
        .populate('participants', 'firstName lastName avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments({ participants: userId }),
    ]);

    return { conversations, total };
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

    await Promise.all([
      this.conversationModel.findByIdAndDelete(conversationId),
      this.messageModel.deleteMany({ conversation: conversationId }),
    ]);
  }

  async canUserAccessConversation(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: userId,
    });

    return !!conversation;
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
}
