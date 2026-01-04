import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument, FeedbackType, FeedbackRating } from './feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackStatsDto } from './dto/feedback-stats.dto';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name) private feedbackModel: Model<FeedbackDocument>,
  ) { }

  async create(createFeedbackDto: CreateFeedbackDto): Promise<Feedback> {
    const feedback = new this.feedbackModel(createFeedbackDto);
    return feedback.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    type?: FeedbackType,
    resolved?: boolean,
    search?: string,
  ): Promise<{ data: Feedback[]; total: number; pages: number }> {
    const query: any = {};

    if (type) {
      query.type = type;
    }

    if (resolved !== undefined) {
      query.resolved = resolved;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { message: searchRegex },
        { email: searchRegex },
        { name: searchRegex },
      ];
    }

    const total = await this.feedbackModel.countDocuments(query);
    const data = await this.feedbackModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('conversationId', 'title')
      .exec();

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Feedback> {
    const feedback = await this.feedbackModel
      .findById(id)
      .populate('userId', 'name email')
      .populate('conversationId', 'title')
      .populate('resolvedBy', 'name email')
      .exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async update(id: string, updateFeedbackDto: UpdateFeedbackDto): Promise<Feedback> {
    const feedback = await this.feedbackModel
      .findByIdAndUpdate(id, updateFeedbackDto, { new: true })
      .populate('userId', 'name email')
      .populate('conversationId', 'title')
      .populate('resolvedBy', 'name email')
      .exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async remove(id: string): Promise<void> {
    const result = await this.feedbackModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Feedback not found');
    }
  }

  async getStats(filters?: FeedbackStatsDto): Promise<any> {
    const { startDate, endDate, type } = filters || {};

    const matchStage: any = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    if (type) {
      matchStage.type = type;
    }

    const stats = await this.feedbackModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          resolvedCount: {
            $sum: { $cond: [{ $eq: ['$resolved', true] }, 1, 0] }
          },
          followUpRequired: {
            $sum: { $cond: [{ $eq: ['$followUpRequired', true] }, 1, 0] }
          },
          ratingDistribution: {
            $push: {
              rating: '$rating',
              count: 1
            }
          }
        }
      },
      {
        $project: {
          total: 1,
          averageRating: { $round: ['$averageRating', 2] },
          resolvedCount: 1,
          resolutionRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$resolvedCount', '$total'] }, 100] }
            ]
          },
          followUpRequired: 1,
          ratingDistribution: {
            $arrayToObject: {
              $map: {
                input: [1, 2, 3, 4, 5],
                as: 'rating',
                in: {
                  k: { $toString: '$$rating' },
                  v: {
                    $size: {
                      $filter: {
                        input: '$ratingDistribution',
                        as: 'item',
                        cond: { $eq: ['$$item.rating', '$$rating'] }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      averageRating: 0,
      resolvedCount: 0,
      resolutionRate: 0,
      followUpRequired: 0,
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    };
  }

  async getRecentFeedback(limit = 5): Promise<Feedback[]> {
    return this.feedbackModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .populate('conversationId', 'title')
      .exec();
  }

  async markAsResolved(id: string, resolvedBy: string, notes?: string): Promise<Feedback> {
    const feedback = await this.feedbackModel.findByIdAndUpdate(
      id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: new Types.ObjectId(resolvedBy),
        followUpNotes: notes,
      },
      { new: true }
    ).exec();

    if (!feedback) {
      throw new NotFoundException(`Feedback with ID ${id} not found`);
    }

    return feedback;
  }

  async getFeedbackByConversation(conversationId: string): Promise<Feedback[]> {
    return this.feedbackModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .populate('userId', 'name email')
      .exec();
  }

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return this.feedbackModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('conversationId', 'title')
      .exec();
  }
}