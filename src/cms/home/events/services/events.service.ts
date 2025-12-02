import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Events } from '../schemas/events.schema';
import { CreateEventsDto, UpdateEventsDto } from '../dto/events.dto';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Events.name) private eventsModel: Model<Events>) {}

  /**
   * Get active events section (Public)
   */
  async getEvents(): Promise<Events> {
    const events = await this.eventsModel
      .findOne({ isActive: true })
      .select('-__v')
      .lean();

    if (!events) {
      throw new NotFoundException('Events section not found');
    }

    return events as any;
  }

  /**
   * Update events section (Admin)
   */
  async updateEvents(dto: UpdateEventsDto): Promise<Events> {
    const events = await this.eventsModel.findOne({ isActive: true });

    if (!events) {
      throw new NotFoundException('Events section not found');
    }

    // Update fields
    if (dto.title !== undefined) events.title = dto.title;
    if (dto.subtitle !== undefined) events.subtitle = dto.subtitle;
    if (dto.events !== undefined) events.events = dto.events as any;
    if (dto.seo !== undefined) events.seo = dto.seo as any;
    if (dto.isActive !== undefined) events.isActive = dto.isActive;

    await events.save();
    return events;
  }

  /**
   * Toggle active status (Admin)
   */
  async toggleActive(): Promise<Events> {
    const events = await this.eventsModel.findOne();

    if (!events) {
      throw new NotFoundException('Events section not found');
    }

    events.isActive = !events.isActive;
    await events.save();

    return events;
  }

  /**
   * Create or initialize events section (Admin)
   */
  async createEvents(dto: CreateEventsDto): Promise<Events> {
    const existing = await this.eventsModel.findOne();

    if (existing) {
      // Update existing
      return this.updateEvents(dto);
    }

    // Create new
    const events = new this.eventsModel(dto);
    await events.save();
    return events;
  }
}
