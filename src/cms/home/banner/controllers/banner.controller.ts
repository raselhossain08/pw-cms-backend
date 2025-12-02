import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { BannerService } from '../services/banner.service';
import { CreateBannerDto, UpdateBannerDto } from '../dto/banner.dto';
import { CloudinaryService } from '../../../services/cloudinary.service';

@ApiTags('CMS - Home Banner')
@Controller({ path: 'cms/home/banner', version: VERSION_NEUTRAL })
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    console.log(
      '✅ BannerController instantiated - Route: /api/cms/home/banner',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  async create(@Body() createDto: CreateBannerDto) {
    return this.bannerService.create(createDto);
  }

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Upload banner media' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Media uploaded successfully' })
  async uploadMedia(
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    let videoUrl = body.videoUrl;
    let thumbnailUrl = body.thumbnail;

    try {
      // Upload files first
      if (files?.video?.[0]) {
        const videoResult = await this.cloudinaryService.uploadImage(
          files.video[0],
          'banners/videos',
        );
        videoUrl = videoResult.url;
      }

      if (files?.thumbnail?.[0]) {
        const thumbnailResult = await this.cloudinaryService.uploadImage(
          files.thumbnail[0],
          'banners/thumbnails',
        );
        thumbnailUrl = thumbnailResult.url;
      }

      // Validate that we have at least a video URL and thumbnail URL
      if (!videoUrl) {
        throw new BadRequestException('Video URL or video file is required');
      }
      if (!thumbnailUrl) {
        throw new BadRequestException(
          'Thumbnail URL or thumbnail file is required',
        );
      }

      // Transform types from FormData strings
      const createDto: CreateBannerDto = {
        title: body.title,
        description: body.description,
        videoUrl,
        thumbnail: thumbnailUrl,
        alt: body.alt,
        link: body.link,
        order: body.order ? parseInt(body.order) : 0,
        isActive: body.isActive === 'true' || body.isActive === true,
        seo:
          body.seo || body['seo[title]']
            ? {
                title: body['seo[title]'] || body.seo?.title || '',
                description:
                  body['seo[description]'] || body.seo?.description || '',
                keywords: body['seo[keywords]'] || body.seo?.keywords || '',
                ogImage: body['seo[ogImage]'] || body.seo?.ogImage || '',
                ogTitle: body['seo[ogTitle]'] || body.seo?.ogTitle || '',
                ogDescription:
                  body['seo[ogDescription]'] || body.seo?.ogDescription || '',
                canonicalUrl:
                  body['seo[canonicalUrl]'] || body.seo?.canonicalUrl || '',
              }
            : undefined,
      };

      const banner = await this.bannerService.create(createDto);

      return {
        message: 'Banner created with media successfully',
        data: banner,
      };
    } catch (error) {
      throw new BadRequestException(`Media upload failed: ${error.message}`);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all banners' })
  @ApiResponse({ status: 200, description: 'Return all banners' })
  async findAll() {
    return this.bannerService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active banners' })
  @ApiResponse({ status: 200, description: 'Return active banners' })
  async findActive() {
    return this.bannerService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get banner by ID' })
  @ApiResponse({ status: 200, description: 'Return banner' })
  async findOne(@Param('id') id: string) {
    return this.bannerService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update banner' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateBannerDto) {
    return this.bannerService.update(id, updateDto);
  }

  @Put(':id/upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
  )
  @ApiOperation({ summary: 'Update banner with media' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Banner updated with media' })
  async updateWithMedia(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    const existingBanner = await this.bannerService.findOne(id);
    let videoUrl = body.videoUrl || existingBanner.videoUrl;
    let thumbnailUrl = body.thumbnail || existingBanner.thumbnail;

    try {
      if (files?.video?.[0]) {
        const videoResult = await this.cloudinaryService.uploadImage(
          files.video[0],
          'banners/videos',
        );
        videoUrl = videoResult.url;
      }

      if (files?.thumbnail?.[0]) {
        const thumbnailResult = await this.cloudinaryService.uploadImage(
          files.thumbnail[0],
          'banners/thumbnails',
        );
        thumbnailUrl = thumbnailResult.url;
      }

      // Transform types from FormData strings
      const updateDto: UpdateBannerDto = {};

      if (body.title) updateDto.title = body.title;
      if (body.description) updateDto.description = body.description;
      if (videoUrl) updateDto.videoUrl = videoUrl;
      if (thumbnailUrl) updateDto.thumbnail = thumbnailUrl;
      if (body.alt) updateDto.alt = body.alt;
      if (body.link) updateDto.link = body.link;
      if (body.order) updateDto.order = parseInt(body.order);
      if (body.isActive !== undefined) {
        updateDto.isActive = body.isActive === 'true' || body.isActive === true;
      }

      if (body.seo || body['seo[title]']) {
        updateDto.seo = {
          title: body['seo[title]'] || body.seo?.title || '',
          description: body['seo[description]'] || body.seo?.description || '',
          keywords: body['seo[keywords]'] || body.seo?.keywords || '',
          ogImage: body['seo[ogImage]'] || body.seo?.ogImage || '',
          ogTitle: body['seo[ogTitle]'] || body.seo?.ogTitle || '',
          ogDescription:
            body['seo[ogDescription]'] || body.seo?.ogDescription || '',
          canonicalUrl:
            body['seo[canonicalUrl]'] || body.seo?.canonicalUrl || '',
        };
      }

      const banner = await this.bannerService.update(id, updateDto);

      return {
        message: 'Banner updated successfully',
        data: banner,
      };
    } catch (error) {
      throw new BadRequestException(`Media upload failed: ${error.message}`);
    }
  }

  @Put('reorder/bulk')
  @ApiOperation({ summary: 'Update banner order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @HttpCode(HttpStatus.OK)
  async updateOrder(@Body() orders: { id: string; order: number }[]) {
    await this.bannerService.updateOrder(orders);
    return { message: 'Banner order updated successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete banner' })
  @ApiResponse({ status: 200, description: 'Banner deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.bannerService.delete(id);
    return { message: 'Banner deleted successfully' };
  }
}
