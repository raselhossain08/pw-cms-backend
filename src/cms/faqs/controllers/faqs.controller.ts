import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FaqsService } from '../services/faqs.service';
import { CreateFaqsDto, UpdateFaqsDto } from '../dto/faqs.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@ApiTags('CMS - FAQs')
@Controller('cms/faqs')
export class FaqsController {
  constructor(
    private readonly faqsService: FaqsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createFaqsDto: CreateFaqsDto) {
    const faqs = await this.faqsService.create(createFaqsDto);
    return {
      success: true,
      message: 'FAQs created successfully',
      data: faqs,
    };
  }

  @Get()
  async findAll() {
    const faqs = await this.faqsService.findAll();
    return {
      success: true,
      message: 'FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Get('active')
  async findActive() {
    const faqs = await this.faqsService.findActive();
    return {
      success: true,
      message: 'Active FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Get('default')
  async getOrCreateDefault() {
    const faqs = await this.faqsService.getOrCreateDefault();
    return {
      success: true,
      message: 'FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const faqs = await this.faqsService.findOne(id);
    return {
      success: true,
      message: 'FAQs retrieved successfully',
      data: faqs,
    };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFaqsDto: UpdateFaqsDto) {
    const faqs = await this.faqsService.update(id, updateFaqsDto);
    return {
      success: true,
      message: 'FAQs updated successfully',
      data: faqs,
    };
  }

  @Put(':id/upload')
  @ApiOperation({ summary: 'Update FAQs with Image Upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    // Handle image upload
    let imageUrl = body['headerSection[image]'];
    if (files?.image?.[0]) {
      const result = await this.cloudinaryService.uploadImage(files.image[0]);
      imageUrl = result.url;
    }

    // Parse headerSection from FormData
    const headerSection = {
      badge: body['headerSection[badge]'],
      title: body['headerSection[title]'],
      description: body['headerSection[description]'],
      image: imageUrl,
      imageAlt: body['headerSection[imageAlt]'] || undefined,
    };

    // Parse categories array from FormData
    const categories: Array<{
      name: string;
      icon: string;
      count: number;
      color: string;
    }> = [];
    let categoryIndex = 0;
    while (body[`categories[${categoryIndex}][name]`]) {
      categories.push({
        name: body[`categories[${categoryIndex}][name]`],
        icon: body[`categories[${categoryIndex}][icon]`],
        count: parseInt(body[`categories[${categoryIndex}][count]`] || '0'),
        color: body[`categories[${categoryIndex}][color]`],
      });
      categoryIndex++;
    }

    // Parse faqs array from FormData
    const faqs: Array<{
      question: string;
      answer: string;
      category: string;
      tags: string[];
      isActive: boolean;
      order: number;
    }> = [];
    let faqIndex = 0;
    while (body[`faqs[${faqIndex}][question]`]) {
      const tags = body[`faqs[${faqIndex}][tags]`]
        ? body[`faqs[${faqIndex}][tags]`]
            .split(',')
            .map((t: string) => t.trim())
        : [];

      faqs.push({
        question: body[`faqs[${faqIndex}][question]`],
        answer: body[`faqs[${faqIndex}][answer]`],
        category: body[`faqs[${faqIndex}][category]`],
        tags: tags,
        isActive: body[`faqs[${faqIndex}][isActive]`] !== 'false',
        order: parseInt(body[`faqs[${faqIndex}][order]`] || '0'),
      });
      faqIndex++;
    }

    // Parse SEO metadata from FormData
    let seo:
      | {
          title?: string;
          description?: string;
          keywords?: string;
          ogImage?: string;
          ogTitle?: string;
          ogDescription?: string;
          canonicalUrl?: string;
        }
      | undefined;

    if (
      body['seo[title]'] ||
      body['seo[description]'] ||
      body['seo[keywords]']
    ) {
      seo = {
        title: body['seo[title]'] || undefined,
        description: body['seo[description]'] || undefined,
        keywords: body['seo[keywords]'] || undefined,
        ogImage: body['seo[ogImage]'] || undefined,
        ogTitle: body['seo[ogTitle]'] || undefined,
        ogDescription: body['seo[ogDescription]'] || undefined,
        canonicalUrl: body['seo[canonicalUrl]'] || undefined,
      };
    }

    const updateDto: UpdateFaqsDto = {
      headerSection,
      categories,
      faqs,
      isActive: body.isActive === 'true',
      seo,
    };

    const updatedFaqs = await this.faqsService.update(id, updateDto);
    return {
      success: true,
      message: 'FAQs updated successfully',
      data: updatedFaqs,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.faqsService.delete(id);
    return {
      success: true,
      message: 'FAQs deleted successfully',
    };
  }
}
