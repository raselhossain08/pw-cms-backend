import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { EventsService } from '../services/events.service';
import { CloudinaryService } from '../../../services/cloudinary.service';
import { CreateEventsDto, UpdateEventsDto } from '../dto/events.dto';

@ApiTags('CMS - Home - Events')
@Controller('cms/home/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Helper method to parse JSON fields
  private parseJsonField(field: any): any[] {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse JSON field:', e);
        return [];
      }
    }
    return [];
  }

  @Get()
  @ApiOperation({ summary: 'Get Events Section' })
  async getEvents() {
    return this.eventsService.getEvents();
  }

  @Put()
  @ApiOperation({ summary: 'Update Events Section' })
  async updateEvents(@Body() dto: UpdateEventsDto) {
    return this.eventsService.updateEvents(dto);
  }

  @Put('upload')
  @ApiOperation({ summary: 'Update Events Section with Image Upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'events[0][image]', maxCount: 1 },
      { name: 'events[1][image]', maxCount: 1 },
      { name: 'events[2][image]', maxCount: 1 },
      { name: 'events[3][image]', maxCount: 1 },
      { name: 'events[4][image]', maxCount: 1 },
      { name: 'events[5][image]', maxCount: 1 },
      { name: 'events[6][image]', maxCount: 1 },
      { name: 'events[7][image]', maxCount: 1 },
      { name: 'events[8][image]', maxCount: 1 },
      { name: 'events[9][image]', maxCount: 1 },
      { name: 'events[10][image]', maxCount: 1 },
      { name: 'events[11][image]', maxCount: 1 },
      { name: 'events[12][image]', maxCount: 1 },
      { name: 'events[13][image]', maxCount: 1 },
      { name: 'events[14][image]', maxCount: 1 },
      { name: 'events[15][image]', maxCount: 1 },
      { name: 'events[16][image]', maxCount: 1 },
      { name: 'events[17][image]', maxCount: 1 },
      { name: 'events[18][image]', maxCount: 1 },
      { name: 'events[19][image]', maxCount: 1 },
    ]),
  )
  async uploadMedia(
    @UploadedFiles() files: { [key: string]: Express.Multer.File[] },
    @Body() body: any,
  ) {
    console.log('=== Events Upload Request ===');
    console.log('Body keys:', Object.keys(body));
    console.log('Files keys:', Object.keys(files || {}));
    console.log('Title:', body.title);
    console.log('Subtitle:', body.subtitle);
    console.log(
      'Sample body data:',
      JSON.stringify(body, null, 2).substring(0, 500),
    );
    console.log('Events[0][title]:', body['events[0][title]']);
    console.log('Events[0][id]:', body['events[0][id]']);
    console.log('body.events type:', typeof body.events);
    console.log('body.events is array:', Array.isArray(body.events));
    console.log('body.events:', body.events);

    // Parse events array from FormData
    let events: Array<any> = [];

    // Check if events is already parsed as an array by body-parser
    if (Array.isArray(body.events)) {
      console.log('Events already parsed as array, processing...');
      events = body.events.map((event: any, index: number) => {
        console.log(`\n--- Processing Event ${index} ---`);
        console.log('Event data:', event);

        // Handle image upload for this event
        const imageFileKey = `events[${index}][image]`;
        const imageUrl = event.image || '';

        if (files[imageFileKey]?.[0]) {
          console.log(`Uploading image for event ${index}`);
          // Image upload will be handled below
        }

        return {
          id: parseInt(event.id) || index + 1,
          title: event.title || '',
          image: imageUrl,
          date: event.date || '',
          time: event.time || '',
          venue: event.venue || '',
          location: event.location || '',
          slug: event.slug || '',
          description: event.description || '',
          price: parseFloat(event.price) || 0,
          videoUrl: event.videoUrl || '',
          trainingContent: this.parseJsonField(event.trainingContent),
          learningPoints: this.parseJsonField(event.learningPoints),
          faqs: this.parseJsonField(event.faqs),
          instructors: this.parseJsonField(event.instructors),
          relatedEvents: this.parseJsonField(event.relatedEvents),
        };
      });

      // Now handle image uploads
      for (let index = 0; index < events.length; index++) {
        const imageFileKey = `events[${index}][image]`;
        if (files[imageFileKey]?.[0]) {
          const result = await this.cloudinaryService.uploadImage(
            files[imageFileKey][0],
          );
          events[index].image = result.url;
        }
      }
    } else {
      // Fallback to old parsing method for FormData with individual keys
      console.log('Using fallback FormData parsing...');
      let eventIndex = 0;
      // Check if event exists (either by title or id being present)
      while (
        body[`events[${eventIndex}][title]`] !== undefined ||
        body[`events[${eventIndex}][id]`] !== undefined
      ) {
        console.log(`\n--- Parsing Event ${eventIndex} ---`);
        console.log(`Title: ${body[`events[${eventIndex}][title]`]}`);
        console.log(`ID: ${body[`events[${eventIndex}][id]`]}`);

        let imageUrl = body[`events[${eventIndex}][image]`];

        // Handle image upload for this event
        const imageFileKey = `events[${eventIndex}][image]`;
        if (files[imageFileKey]?.[0]) {
          const result = await this.cloudinaryService.uploadImage(
            files[imageFileKey][0],
          );
          imageUrl = result.url;
        }

        // Parse nested JSON data
        let trainingContent = [];
        let learningPoints = [];
        let faqs = [];
        let instructors = [];
        let relatedEvents = [];

        try {
          if (body[`events[${eventIndex}][trainingContent]`]) {
            trainingContent = JSON.parse(
              body[`events[${eventIndex}][trainingContent]`],
            );
          }
        } catch (e) {
          console.error('Failed to parse trainingContent:', e);
        }

        try {
          if (body[`events[${eventIndex}][learningPoints]`]) {
            learningPoints = JSON.parse(
              body[`events[${eventIndex}][learningPoints]`],
            );
          }
        } catch (e) {
          console.error('Failed to parse learningPoints:', e);
        }

        try {
          if (body[`events[${eventIndex}][faqs]`]) {
            faqs = JSON.parse(body[`events[${eventIndex}][faqs]`]);
          }
        } catch (e) {
          console.error('Failed to parse faqs:', e);
        }

        try {
          if (body[`events[${eventIndex}][instructors]`]) {
            instructors = JSON.parse(
              body[`events[${eventIndex}][instructors]`],
            );
          }
        } catch (e) {
          console.error('Failed to parse instructors:', e);
        }

        try {
          if (body[`events[${eventIndex}][relatedEvents]`]) {
            relatedEvents = JSON.parse(
              body[`events[${eventIndex}][relatedEvents]`],
            );
          }
        } catch (e) {
          console.error('Failed to parse relatedEvents:', e);
        }

        events.push({
          id: parseInt(body[`events[${eventIndex}][id]`]) || eventIndex + 1,
          title: body[`events[${eventIndex}][title]`] || '',
          image: imageUrl || '',
          date: body[`events[${eventIndex}][date]`] || '',
          time: body[`events[${eventIndex}][time]`] || '',
          venue: body[`events[${eventIndex}][venue]`] || '',
          location: body[`events[${eventIndex}][location]`] || '',
          slug: body[`events[${eventIndex}][slug]`] || '',
          description: body[`events[${eventIndex}][description]`] || '',
          price: parseFloat(body[`events[${eventIndex}][price]`]) || 0,
          videoUrl: body[`events[${eventIndex}][videoUrl]`] || '',
          trainingContent,
          learningPoints,
          faqs,
          instructors,
          relatedEvents,
        });
        console.log(`Event ${eventIndex} parsed successfully`);
        eventIndex++;
      }
    } // End of fallback parsing

    console.log(`\nTotal events parsed: ${events.length}`);

    // Parse SEO data
    const seo = Array.isArray(body.seo) ? {} : body.seo || {};
    if (!Array.isArray(body.seo)) {
      seo.title = body.seo?.title || body['seo[title]'] || '';
      seo.description = body.seo?.description || body['seo[description]'] || '';
      seo.keywords = body.seo?.keywords || body['seo[keywords]'] || '';
      seo.ogImage = body.seo?.ogImage || body['seo[ogImage]'] || '';
    }

    // Construct DTO
    const dto: UpdateEventsDto = {
      title: body.title || '',
      subtitle: body.subtitle || '',
      events: events as any,
      seo,
    };

    console.log('=== Final DTO ===');
    console.log('Title:', dto.title);
    console.log('Subtitle:', dto.subtitle);
    console.log('Events count:', dto.events?.length || 0);
    console.log('First event:', dto.events?.[0]);
    console.log('SEO:', dto.seo);

    const result = await this.eventsService.updateEvents(dto);
    console.log('=== Update Result ===');
    console.log('Result:', result);
    return result;
  }

  @Post()
  @ApiOperation({ summary: 'Create Events Section' })
  async createEvents(@Body() dto: CreateEventsDto) {
    return this.eventsService.createEvents(dto);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Events' })
  async export(
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      const result = await this.eventsService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="events_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="events_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export events',
        data: null,
      });
    }
  }
}
