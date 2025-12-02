import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserPoints,
  PointTransaction,
  Badge,
  Achievement,
  PointActivityType,
} from './entities/gamification.entity';

@Injectable()
export class GamificationService {
  constructor(
    @InjectModel(UserPoints.name) private userPointsModel: Model<UserPoints>,
    @InjectModel(PointTransaction.name)
    private transactionModel: Model<PointTransaction>,
    @InjectModel(Badge.name) private badgeModel: Model<Badge>,
    @InjectModel(Achievement.name) private achievementModel: Model<Achievement>,
  ) {}

  private readonly pointsMap: Record<PointActivityType, number> = {
    [PointActivityType.COURSE_COMPLETED]: 100,
    [PointActivityType.LESSON_COMPLETED]: 10,
    [PointActivityType.QUIZ_PASSED]: 25,
    [PointActivityType.ASSIGNMENT_SUBMITTED]: 20,
    [PointActivityType.PERFECT_SCORE]: 50,
    [PointActivityType.DAILY_LOGIN]: 5,
    [PointActivityType.COURSE_REVIEWED]: 15,
    [PointActivityType.DISCUSSION_POST]: 5,
    [PointActivityType.HELP_OTHERS]: 10,
    [PointActivityType.STREAK_MILESTONE]: 30,
  };

  async awardPoints(
    userId: string,
    activityType: PointActivityType,
    reference?: string,
    referenceModel?: string,
  ): Promise<UserPoints> {
    const points = this.pointsMap[activityType];

    let userPoints = await this.userPointsModel.findOne({ user: userId });
    if (!userPoints) {
      userPoints = new this.userPointsModel({ user: userId });
    }

    userPoints.totalPoints += points;
    userPoints.level = Math.floor(userPoints.totalPoints / 100) + 1;

    const transaction = new this.transactionModel({
      user: userId,
      activityType,
      points,
      description: `Earned ${points} points for ${activityType.replace(/_/g, ' ')}`,
      reference,
      referenceModel,
    });

    await Promise.all([userPoints.save(), transaction.save()]);
    return userPoints;
  }

  async getLeaderboard(limit: number = 10): Promise<UserPoints[]> {
    return this.userPointsModel
      .find()
      .populate('user', 'firstName lastName avatar')
      .sort({ totalPoints: -1 })
      .limit(limit)
      .exec();
  }

  async getUserPoints(userId: string): Promise<UserPoints> {
    let userPoints = await this.userPointsModel
      .findOne({ user: userId })
      .populate('badges')
      .populate('achievements');

    if (!userPoints) {
      userPoints = new this.userPointsModel({ user: userId });
      await userPoints.save();
    }

    return userPoints;
  }
}
