import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import {
  UserPoints,
  UserPointsSchema,
  PointTransaction,
  PointTransactionSchema,
  Badge,
  BadgeSchema,
  Achievement,
  AchievementSchema,
} from './entities/gamification.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPoints.name, schema: UserPointsSchema },
      { name: PointTransaction.name, schema: PointTransactionSchema },
      { name: Badge.name, schema: BadgeSchema },
      { name: Achievement.name, schema: AchievementSchema },
    ]),
  ],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
