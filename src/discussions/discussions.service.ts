import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Discussion,
  DiscussionReply,
} from '../certificates/entities/additional.entity';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectModel(Discussion.name) private discussionModel: Model<Discussion>,
    @InjectModel(DiscussionReply.name)
    private replyModel: Model<DiscussionReply>,
  ) {}

  async createDiscussion(
    courseId: string,
    userId: string,
    data: { title: string; content: string },
  ): Promise<Discussion> {
    const discussion = new this.discussionModel({
      course: courseId,
      author: userId,
      title: data.title,
      content: data.content,
    });

    return await discussion.save();
  }

  async getCourseDiscussions(
    courseId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ discussions: Discussion[]; total: number }> {
    const skip = (page - 1) * limit;

    const [discussions, total] = await Promise.all([
      this.discussionModel
        .find({ course: courseId })
        .populate('author', 'firstName lastName avatar')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.discussionModel.countDocuments({ course: courseId }),
    ]);

    return { discussions, total };
  }

  async getDiscussion(id: string): Promise<Discussion> {
    const discussion = await this.discussionModel
      .findById(id)
      .populate('author', 'firstName lastName avatar')
      .populate('course', 'title');

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return discussion;
  }

  async updateDiscussion(
    id: string,
    userId: string,
    data: { title?: string; content?: string },
  ): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.author.toString() !== userId) {
      throw new ForbiddenException('You can only update your own discussions');
    }

    Object.assign(discussion, data);
    return await discussion.save();
  }

  async deleteDiscussion(id: string, userId: string): Promise<void> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own discussions');
    }

    await Promise.all([
      this.discussionModel.findByIdAndDelete(id),
      this.replyModel.deleteMany({ discussion: id }),
    ]);
  }

  async likeDiscussion(id: string, userId: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const index = discussion.likes.findIndex((id) => id.toString() === userId);

    if (index > -1) {
      discussion.likes.splice(index, 1);
    } else {
      discussion.likes.push(userObjectId);
    }

    return await discussion.save();
  }

  async toggleSolved(id: string, userId: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.author.toString() !== userId) {
      throw new ForbiddenException('Only the author can mark as solved');
    }

    discussion.isSolved = !discussion.isSolved;
    return await discussion.save();
  }

  async pinDiscussion(id: string): Promise<Discussion> {
    const discussion = await this.discussionModel.findById(id);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    discussion.isPinned = !discussion.isPinned;
    return await discussion.save();
  }

  async addReply(
    discussionId: string,
    userId: string,
    content: string,
  ): Promise<DiscussionReply> {
    const discussion = await this.discussionModel.findById(discussionId);

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const reply = new this.replyModel({
      discussion: discussionId,
      author: userId,
      content,
    });

    const savedReply = await reply.save();

    // Increment reply count
    discussion.replyCount += 1;
    await discussion.save();

    return savedReply;
  }

  async getDiscussionReplies(
    discussionId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ replies: DiscussionReply[]; total: number }> {
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      this.replyModel
        .find({ discussion: discussionId })
        .populate('author', 'firstName lastName avatar')
        .sort({ isAnswer: -1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.replyModel.countDocuments({ discussion: discussionId }),
    ]);

    return { replies, total };
  }

  async updateReply(
    id: string,
    userId: string,
    content: string,
  ): Promise<DiscussionReply> {
    const reply = await this.replyModel.findById(id);

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.author.toString() !== userId) {
      throw new ForbiddenException('You can only update your own replies');
    }

    reply.content = content;
    return await reply.save();
  }

  async deleteReply(id: string, userId: string): Promise<void> {
    const reply = await this.replyModel.findById(id);

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (reply.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own replies');
    }

    const discussionId = reply.discussion;
    await this.replyModel.findByIdAndDelete(id);

    // Decrement reply count
    await this.discussionModel.findByIdAndUpdate(discussionId, {
      $inc: { replyCount: -1 },
    });
  }

  async likeReply(id: string, userId: string): Promise<DiscussionReply> {
    const reply = await this.replyModel.findById(id);

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const index = reply.likes.findIndex((id) => id.toString() === userId);

    if (index > -1) {
      reply.likes.splice(index, 1);
    } else {
      reply.likes.push(userObjectId);
    }

    return await reply.save();
  }

  async markAsAnswer(
    id: string,
    discussionAuthorId: string,
  ): Promise<DiscussionReply> {
    const reply = await this.replyModel.findById(id).populate('discussion');

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    const discussion = reply.discussion as any;
    if (discussion.author.toString() !== discussionAuthorId) {
      throw new ForbiddenException(
        'Only the discussion author can mark answers',
      );
    }

    reply.isAnswer = !reply.isAnswer;
    return await reply.save();
  }
}
