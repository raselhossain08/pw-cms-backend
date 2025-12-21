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
  ) { }

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

  @Post('toggle-active')
  @ApiOperation({ summary: 'Toggle Active Status' })
  async toggleActive() {
    return this.eventsService.toggleActive();
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
    ]),
  )
  async uploadMedia(
    @UploadedFiles() files: { [key: string]: Express.Multer.File[] },
    @Body() body: any,
  ) {
    // Parse events array from FormData
    const events: Array<{
      id: number;
      title: string;
      image: string;
      date: string;
      time: string;
      venue: string;
      location: string;
      slug: string;
      description?: string;
    }> = [];

    let eventIndex = 0;
    while (body[`events[${eventIndex}][title]`]) {
      let imageUrl = body[`events[${eventIndex}][image]`];

      // Handle image upload for this event
      const imageFileKey = `events[${eventIndex}][image]`;
      if (files[imageFileKey]?.[0]) {
        const result = await this.cloudinaryService.uploadImage(
          files[imageFileKey][0],
        );
        imageUrl = result.url;
      }

      events.push({
        id: parseInt(body[`events[${eventIndex}][id]`]) || eventIndex + 1,
        title: body[`events[${eventIndex}][title]`],
        image: imageUrl,
        date: body[`events[${eventIndex}][date]`],
        time: body[`events[${eventIndex}][time]`],
        venue: body[`events[${eventIndex}][venue]`],
        location: body[`events[${eventIndex}][location]`],
        slug: body[`events[${eventIndex}][slug]`],
        description: body[`events[${eventIndex}][description]`] || '',
      });
      eventIndex++;
    }

    // Parse SEO data
    const seo = {
      title: body['seo[title]'] || '',
      description: body['seo[description]'] || '',
      keywords: body['seo[keywords]'] || '',
      ogImage: body['seo[ogImage]'] || '',
    };

    // Construct DTO
    const dto: UpdateEventsDto = {
      title: body.title,
      subtitle: body.subtitle,
      events,
      seo,
      isActive: body.isActive === 'true' || body.isActive === true,
    };

    return this.eventsService.updateEvents(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create Events Section' })
  async createEvents(@Body() dto: CreateEventsDto) {
    return this.eventsService.createEvents(dto);
  }

  @Post(':slug/duplicate')
  @ApiOperation({ summary: 'Duplicate Event' })
  async duplicateEvent(@Param('slug') slug: string) {
    try {
      const duplicated = await this.eventsService.duplicateEvent(slug);
      return {
        success: true,
        message: 'Event duplicated successfully',
        data: duplicated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate event',
        data: null,
      };
    }
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Events' })
  async export(@Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.eventsService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="events_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="events_${new Date().toISOString().split('T')[0]}.json"`);
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
