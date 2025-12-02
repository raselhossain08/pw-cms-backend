import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewType } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private reviewModel: Model<Review>) {}

  async create(
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<Review> {
    // Check if user already reviewed this item
    const existing = await this.reviewModel.findOne({
      user: userId,
      itemId: createReviewDto.itemId,
      type: createReviewDto.type,
    });

    if (existing) {
      throw new BadRequestException('You have already reviewed this item');
    }

    const review = new this.reviewModel({
      ...createReviewDto,
      user: userId,
    });

    return await review.save();
  }

  async findAll(query: {
    type?: ReviewType;
    itemId?: string;
    rating?: number;
    page?: number;
    limit?: number;
  }): Promise<{ reviews: Review[]; total: number; stats?: any }> {
    const { type, itemId, rating, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };
    if (type) filter.type = type;
    if (itemId) filter.itemId = itemId;
    if (rating) filter.rating = rating;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('user', 'firstName lastName avatar')
        .populate('instructorReply', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter),
    ]);

    // Get rating stats for the item
    let stats = null;
    if (itemId) {
      stats = await this.getReviewStats(itemId, type!);
    }

    return { reviews, total, stats };
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewModel
      .findById(id)
      .populate('user', 'firstName lastName avatar')
      .populate('instructorReply', 'firstName lastName');

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user.toString() !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    Object.assign(review, updateReviewDto);
    return await review.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.user.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewModel.findByIdAndDelete(id);
  }

  async markHelpful(id: string, userId: string): Promise<Review> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const index = review.helpful.findIndex((id) => id.toString() === userId);

    if (index > -1) {
      // Remove if already marked
      review.helpful.splice(index, 1);
    } else {
      // Add if not marked
      review.helpful.push(userObjectId);
    }

    return await review.save();
  }

  async replyToReview(
    id: string,
    replyText: string,
    instructorId: string,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(id);

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.instructorReply = new Types.ObjectId(instructorId);
    review.replyText = replyText;
    review.repliedAt = new Date();

    return await review.save();
  }

  async getReviewStats(itemId: string, type: ReviewType): Promise<any> {
    const stats = await this.reviewModel.aggregate([
      {
        $match: {
          itemId: new Types.ObjectId(itemId),
          type,
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
    ]);

    return (
      stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        rating5: 0,
        rating4: 0,
        rating3: 0,
        rating2: 0,
        rating1: 0,
      }
    );
  }

  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ reviews: Review[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ user: userId })
        .populate('instructorReply', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ user: userId }),
    ]);

    return { reviews, total };
  }
}
