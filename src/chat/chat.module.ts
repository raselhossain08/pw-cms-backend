import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { AIChatService } from './services/ai-chat.service';
import { ChatLoggerService } from './services/chat-logger.service';
import { ChatAuthGuard } from './guards/chat-auth.guard';
import {
  Conversation,
  ConversationSchema,
} from './entities/conversation.entity';
import { Message, MessageSchema } from './entities/message.entity';
import { ChatEventLog, ChatEventLogSchema } from './entities/chat-log.entity';
import { AuthModule } from '../auth/auth.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { User, UserSchema } from '../users/entities/user.entity';
import { AiBotModule } from '../ai-bot/ai-bot.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: ChatEventLog.name, schema: ChatEventLogSchema }, // Add this for chat logging
      { name: User.name, schema: UserSchema }, // Add this for user lookup
    ]),
    AuthModule,
    ActivityLogsModule, // Add this for logging
    AiBotModule, // Add AI bot module for AI services
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, AIChatService, ChatLoggerService, ChatAuthGuard],
  exports: [ChatService, ChatLoggerService],
})
export class ChatModule { }
