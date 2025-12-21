import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AboutSectionService } from '../services/about-section.service';
import { CloudinaryService } from '../../../services/cloudinary.service';
import {
  CreateAboutSectionDto,
  UpdateAboutSectionDto,
} from '../dto/about-section.dto';

@ApiTags('CMS - Home - About Section')
@Controller('cms/home/about-section')
export class AboutSectionController {
  constructor(
    private readonly aboutSectionService: AboutSectionService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get About Section' })
  async getAboutSection() {
    return this.aboutSectionService.getAboutSection();
  }

  @Put()
  @ApiOperation({ summary: 'Update About Section' })
  async updateAboutSection(@Body() dto: UpdateAboutSectionDto) {
    return this.aboutSectionService.updateAboutSection(dto);
  }

  @Post('toggle-active')
  @ApiOperation({ summary: 'Toggle Active Status' })
  async toggleActive() {
    return this.aboutSectionService.toggleActive();
  }

  @Put('upload')
  @ApiOperation({ summary: 'Update About Section with Image Upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async uploadMedia(
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    // Handle image upload
    let imageUrl = body.image;
    if (files?.image?.[0]) {
      const result = await this.cloudinaryService.uploadImage(files.image[0]);
      imageUrl = result.url;
    }

    // Parse highlights array from FormData
    const highlights: Array<{ icon: string; label: string; text: string }> = [];
    let highlightIndex = 0;
    while (body[`highlights[${highlightIndex}][icon]`]) {
      highlights.push({
        icon: body[`highlights[${highlightIndex}][icon]`],
        label: body[`highlights[${highlightIndex}][label]`],
        text: body[`highlights[${highlightIndex}][text]`],
      });
      highlightIndex++;
    }

    // Parse stats array from FormData
    const stats: Array<{ value: number; suffix: string; label: string }> = [];
    let statIndex = 0;
    while (body[`stats[${statIndex}][value]`]) {
      stats.push({
        value: parseInt(body[`stats[${statIndex}][value]`]),
        suffix: body[`stats[${statIndex}][suffix]`] || '',
        label: body[`stats[${statIndex}][label]`],
      });
      statIndex++;
    }

    // Parse CTA from FormData
    const cta = {
      label: body['cta[label]'],
      link: body['cta[link]'],
    };

    // Parse SEO metadata from FormData
    let seo:
      | {
        title: string;
        description: string;
        keywords: string;
        ogImage: string;
        ogTitle: string;
        ogDescription: string;
        canonicalUrl: string;
      }
      | undefined = undefined;
    if (body['seo[title]']) {
      seo = {
        title: body['seo[title]'],
        description: body['seo[description]'],
        keywords: body['seo[keywords]'],
        ogImage: body['seo[ogImage]'],
        ogTitle: body['seo[ogTitle]'],
        ogDescription: body['seo[ogDescription]'],
        canonicalUrl: body['seo[canonicalUrl]'],
      };
    }

    // Create DTO with manual type conversion
    const createDto: CreateAboutSectionDto = {
      id: body.id || 'about',
      title: body.title,
      subtitle: body.subtitle,
      description: body.description,
      image: imageUrl,
      highlights: highlights.length > 0 ? highlights : [],
      cta,
      stats: stats.length > 0 ? stats : [],
      seo,
      isActive: body.isActive === 'true' || body.isActive === true,
    };

    return this.aboutSectionService.upsertAboutSection(createDto);
  }

  @Post('duplicate')
  @ApiOperation({ summary: 'Duplicate About Section' })
  async duplicate() {
    try {
      const duplicated = await this.aboutSectionService.duplicate();
      return {
        success: true,
        message: 'About section duplicated successfully',
        data: duplicated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate about section',
        data: null,
      };
    }
  }

  @Get('export')
  @ApiOperation({ summary: 'Export About Section' })
  async export(@Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.aboutSectionService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="about-section_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="about-section_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export about section',
        data: null,
      });
    }
  }
}
