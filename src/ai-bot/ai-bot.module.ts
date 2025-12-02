import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiBotController } from './ai-bot.controller';
import { AiBotService } from './ai-bot.service';
import { AiBotGateway } from './ai-bot.gateway';
import { ChatGPTService } from './services/chatgpt.service';
import { BotActionsService } from './services/bot-actions.service';
import {
  BotConversation,
  BotConversationSchema,
  KnowledgeBase,
  KnowledgeBaseSchema,
  BotAnalytics,
  BotAnalyticsSchema,
  BotTask,
  BotTaskSchema,
} from './entities/ai-bot.entity';
import { Course, CourseSchema } from '../courses/entities/course.entity';
import {
  Enrollment,
  EnrollmentSchema,
} from '../enrollments/entities/enrollment.entity';
import { Order, OrderSchema } from '../orders/entities/order.entity';
import { User, UserSchema } from '../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotConversation.name, schema: BotConversationSchema },
      { name: KnowledgeBase.name, schema: KnowledgeBaseSchema },
      { name: BotAnalytics.name, schema: BotAnalyticsSchema },
      { name: BotTask.name, schema: BotTaskSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AiBotController],
  providers: [AiBotService, AiBotGateway, ChatGPTService, BotActionsService],
  exports: [AiBotService, AiBotGateway],
})
export class AiBotModule {}
