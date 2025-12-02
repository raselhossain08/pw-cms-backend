import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ticket, TicketReply, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(TicketReply.name) private ticketReplyModel: Model<TicketReply>,
  ) {}

  async createTicket(
    createTicketDto: CreateTicketDto,
    userId: string,
  ): Promise<Ticket> {
    const ticketNumber = await this.generateTicketNumber();

    const ticket = new this.ticketModel({
      ...createTicketDto,
      userId,
      ticketNumber,
    });

    return ticket.save();
  }

  async findAll(filters: any): Promise<any> {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      assignedTo,
      userId,
    } = filters;
    const query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (userId) query.userId = userId;

    const total = await this.ticketModel.countDocuments(query).exec();
    const tickets = await this.ticketModel
      .find(query)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('relatedCourse', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    return {
      tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const ticket = await this.ticketModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('relatedCourse', 'title')
      .populate('relatedOrder')
      .exec();

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const replies = await this.ticketReplyModel
      .find({ ticketId: id })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .exec();

    return { ticket, replies };
  }

  async getUserTickets(userId: string, page = 1, limit = 20): Promise<any> {
    return this.findAll({ page, limit, userId });
  }

  async updateTicket(
    id: string,
    updateTicketDto: UpdateTicketDto,
  ): Promise<Ticket | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (updateTicketDto.status) {
      ticket.status = updateTicketDto.status;

      if (updateTicketDto.status === TicketStatus.RESOLVED) {
        ticket.resolvedAt = new Date();
      }
      if (updateTicketDto.status === TicketStatus.CLOSED) {
        ticket.closedAt = new Date();
      }
    }

    if (updateTicketDto.priority) {
      ticket.priority = updateTicketDto.priority;
    }

    if (updateTicketDto.assignedTo) {
      ticket.assignedTo = updateTicketDto.assignedTo as any;
    }

    return ticket.save();
  }

  async addReply(
    ticketId: string,
    createReplyDto: CreateReplyDto,
    userId: string,
    isStaff: boolean,
  ): Promise<TicketReply> {
    const ticket = await this.ticketModel.findById(ticketId).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const reply = new this.ticketReplyModel({
      ticketId,
      userId,
      message: createReplyDto.message,
      attachments: createReplyDto.attachments || [],
      isStaffReply: isStaff,
      isInternal: createReplyDto.isInternal || false,
    });

    await reply.save();

    // Update ticket status if customer replied
    if (!isStaff && ticket.status === TicketStatus.WAITING_FOR_CUSTOMER) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await ticket.save();
    }

    return reply;
  }

  async rateTicket(
    id: string,
    rateTicketDto: RateTicketDto,
    userId: string,
  ): Promise<Ticket | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId.toString() !== userId) {
      throw new BadRequestException('You can only rate your own tickets');
    }

    if (
      ticket.status !== TicketStatus.RESOLVED &&
      ticket.status !== TicketStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Only resolved or closed tickets can be rated',
      );
    }

    ticket.rating = rateTicketDto.rating;
    if (rateTicketDto.feedback) ticket.feedback = rateTicketDto.feedback;

    return ticket.save();
  }

  async closeTicket(id: string): Promise<Ticket | null> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();

    return ticket.save();
  }

  async getTicketStats(): Promise<any> {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.ticketModel.countDocuments().exec(),
      this.ticketModel.countDocuments({ status: TicketStatus.OPEN }).exec(),
      this.ticketModel
        .countDocuments({ status: TicketStatus.IN_PROGRESS })
        .exec(),
      this.ticketModel.countDocuments({ status: TicketStatus.RESOLVED }).exec(),
      this.ticketModel.countDocuments({ status: TicketStatus.CLOSED }).exec(),
    ]);

    const avgResolutionTime = await this.ticketModel
      .aggregate([
        {
          $match: {
            resolvedAt: { $exists: true },
            createdAt: { $exists: true },
          },
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60, // Convert to hours
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' },
          },
        },
      ])
      .exec();

    const satisfactionRating = await this.ticketModel
      .aggregate([
        { $match: { rating: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 },
          },
        },
      ])
      .exec();

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      averageResolutionTime: avgResolutionTime[0]?.avgTime || 0,
      satisfaction: {
        averageRating: satisfactionRating[0]?.avgRating || 0,
        totalRatings: satisfactionRating[0]?.totalRatings || 0,
      },
    };
  }

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.ticketModel.countDocuments().exec();
    const ticketNumber = `TKT-${year}${month}-${String(count + 1).padStart(5, '0')}`;

    return ticketNumber;
  }
}
