import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Events } from '../schemas/events.schema';
import { CreateEventsDto, UpdateEventsDto } from '../dto/events.dto';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Events.name) private eventsModel: Model<Events>) { }

  /**
   * Get events section (Public)
   */
  async getEvents(): Promise<Events> {
    let events = await this.eventsModel
      .findOne()
      .select('-__v')
      .lean();

    if (!events) {
      // Create initial events document if it doesn't exist
      const initialEvents = new this.eventsModel({
        title: 'Upcoming Events',
        subtitle: 'Join our aviation community',
        events: [],
        seo: {
          title: 'Events',
          description: 'Join our upcoming aviation events and training sessions',
          keywords: 'aviation events, pilot training, aviation community',
          ogImage: '',
        },
      });
      await initialEvents.save();
      events = await this.eventsModel.findOne().select('-__v').lean();
    }

    return events as any;
  }

  /**
   * Update events section (Admin)
   */
  async updateEvents(dto: UpdateEventsDto): Promise<Events> {
    console.log('=== Service: updateEvents called ===');
    console.log('DTO events count:', dto.events?.length || 0);
    console.log('DTO events:', JSON.stringify(dto.events, null, 2));
    console.log('DTO first event:', dto.events?.[0]);

    let events = await this.eventsModel.findOne();

    if (!events) {
      console.log('No existing events document, creating new one');
      // Create initial document if it doesn't exist
      events = new this.eventsModel({
        title: dto.title || 'Upcoming Events',
        subtitle: dto.subtitle || 'Join our aviation community',
        events: dto.events || [],
        seo: dto.seo || {
          title: 'Events',
          description: 'Join our upcoming aviation events and training sessions',
          keywords: 'aviation events, pilot training, aviation community',
          ogImage: '',
        },
      });
    } else {
      console.log('Updating existing events document');
      console.log('Before update - events count:', events.events?.length || 0);
      // Update fields
      if (dto.title !== undefined) events.title = dto.title;
      if (dto.subtitle !== undefined) events.subtitle = dto.subtitle;
      if (dto.events !== undefined) {
        console.log('Setting events array with', dto.events.length, 'events');
        events.events = dto.events as any;
      }
      if (dto.seo !== undefined) events.seo = dto.seo as any;
      console.log('After assignment - events count:', events.events?.length || 0);
    }

    console.log('=== About to save ===');
    console.log('Events to save:', events.events);

    try {
      const savedEvents = await events.save();
      console.log('=== Service: Saved successfully ===');
      console.log('Saved events count:', savedEvents.events?.length || 0);
      console.log('Saved events:', JSON.stringify(savedEvents.events, null, 2));
      console.log('Saved first event:', savedEvents.events?.[0]);
      return savedEvents;
    } catch (error) {
      console.error('=== Service: Save FAILED ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
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

  /**
   * Export events
   */
  async export(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const events = await this.eventsModel.findOne();

    if (!events) {
      throw new NotFoundException('Events section not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(events, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      events,
    };
  }
}
