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

    // Manually convert to plain objects with proper date serialization
    const ticketsData = tickets.map((ticket) => {
      const obj: any = ticket.toObject();
      // Ensure dates are properly converted to ISO strings
      if (obj.createdAt) {
        obj.createdAt =
          obj.createdAt instanceof Date
            ? obj.createdAt.toISOString()
            : new Date(obj.createdAt).toISOString();
      }
      if (obj.updatedAt) {
        obj.updatedAt =
          obj.updatedAt instanceof Date
            ? obj.updatedAt.toISOString()
            : new Date(obj.updatedAt).toISOString();
      }
      if (obj.resolvedAt) {
        obj.resolvedAt =
          obj.resolvedAt instanceof Date
            ? obj.resolvedAt.toISOString()
            : new Date(obj.resolvedAt).toISOString();
      }
      if (obj.closedAt) {
        obj.closedAt =
          obj.closedAt instanceof Date
            ? obj.closedAt.toISOString()
            : new Date(obj.closedAt).toISOString();
      }
      return obj;
    });

    return {
      tickets: ticketsData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<any> {
    const ticketDoc = await this.ticketModel
      .findById(id)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .populate('relatedCourse', 'title')
      .populate('relatedOrder')
      .exec();

    if (!ticketDoc) {
      throw new NotFoundException('Ticket not found');
    }

    // Convert to plain object with proper date serialization
    const ticket: any = ticketDoc.toObject();
    if (ticket.createdAt) {
      ticket.createdAt =
        ticket.createdAt instanceof Date
          ? ticket.createdAt.toISOString()
          : new Date(ticket.createdAt).toISOString();
    }
    if (ticket.updatedAt) {
      ticket.updatedAt =
        ticket.updatedAt instanceof Date
          ? ticket.updatedAt.toISOString()
          : new Date(ticket.updatedAt).toISOString();
    }
    if (ticket.resolvedAt) {
      ticket.resolvedAt =
        ticket.resolvedAt instanceof Date
          ? ticket.resolvedAt.toISOString()
          : new Date(ticket.resolvedAt).toISOString();
    }
    if (ticket.closedAt) {
      ticket.closedAt =
        ticket.closedAt instanceof Date
          ? ticket.closedAt.toISOString()
          : new Date(ticket.closedAt).toISOString();
    }

    const replyDocs = await this.ticketReplyModel
      .find({ ticketId: id })
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .exec();

    // Convert replies to plain objects with proper date serialization
    const replies = replyDocs.map((reply) => {
      const obj: any = reply.toObject();
      if (obj.createdAt) {
        obj.createdAt =
          obj.createdAt instanceof Date
            ? obj.createdAt.toISOString()
            : new Date(obj.createdAt).toISOString();
      }
      if (obj.updatedAt) {
        obj.updatedAt =
          obj.updatedAt instanceof Date
            ? obj.updatedAt.toISOString()
            : new Date(obj.updatedAt).toISOString();
      }
      return obj;
    });

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

    if (updateTicketDto.subject) {
      ticket.subject = updateTicketDto.subject;
    }

    if (updateTicketDto.description) {
      ticket.description = updateTicketDto.description;
    }

    if (updateTicketDto.category) {
      ticket.category = updateTicketDto.category;
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

  async deleteTicket(id: string): Promise<void> {
    const ticket = await this.ticketModel.findById(id).exec();
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Delete all replies first
    await this.ticketReplyModel.deleteMany({ ticketId: id }).exec();

    // Delete the ticket
    await this.ticketModel.findByIdAndDelete(id).exec();
  }

  async getTicketStats(): Promise<any> {
    const [total, open, inProgress, pending, resolved, closed, escalated] =
      await Promise.all([
        this.ticketModel.countDocuments().exec(),
        this.ticketModel.countDocuments({ status: TicketStatus.OPEN }).exec(),
        this.ticketModel
          .countDocuments({ status: TicketStatus.IN_PROGRESS })
          .exec(),
        this.ticketModel
          .countDocuments({ status: TicketStatus.WAITING_FOR_CUSTOMER })
          .exec(),
        this.ticketModel
          .countDocuments({ status: TicketStatus.RESOLVED })
          .exec(),
        this.ticketModel.countDocuments({ status: TicketStatus.CLOSED }).exec(),
        this.ticketModel
          .countDocuments({
            priority: 'urgent',
            status: { $ne: TicketStatus.CLOSED },
          })
          .exec(),
      ]);

    // Calculate average response time (time to first reply)
    const avgResponseTimeResult = await this.ticketReplyModel
      .aggregate([
        {
          $group: {
            _id: '$ticketId',
            firstReplyTime: { $min: '$createdAt' },
          },
        },
        {
          $lookup: {
            from: 'tickets',
            localField: '_id',
            foreignField: '_id',
            as: 'ticket',
          },
        },
        {
          $unwind: '$ticket',
        },
        {
          $project: {
            responseTime: {
              $divide: [
                { $subtract: ['$firstReplyTime', '$ticket.createdAt'] },
                1000 * 60 * 60, // Convert to hours
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$responseTime' },
          },
        },
      ])
      .exec();

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

    const avgResponseTimeHours = avgResponseTimeResult[0]?.avgTime || 0;
    const avgRating = satisfactionRating[0]?.avgRating || 0;
    const satisfactionRate =
      avgRating > 0 ? Math.round((avgRating / 5) * 100) : 0;

    // Format response time
    let avgResponseTimeFormatted = '0h';
    if (avgResponseTimeHours > 0) {
      if (avgResponseTimeHours < 1) {
        avgResponseTimeFormatted = `${Math.round(avgResponseTimeHours * 60)}m`;
      } else if (avgResponseTimeHours < 24) {
        avgResponseTimeFormatted = `${avgResponseTimeHours.toFixed(1)}h`;
      } else {
        avgResponseTimeFormatted = `${(avgResponseTimeHours / 24).toFixed(1)}d`;
      }
    }

    return {
      total,
      open,
      inProgress,
      pending,
      resolved,
      closed,
      escalated,
      avgResponseTime: avgResponseTimeFormatted,
      satisfactionRate,
      averageResolutionTime: avgResolutionTime[0]?.avgTime || 0,
      satisfaction: {
        averageRating: avgRating,
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
