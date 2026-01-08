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
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { UserRole } from '../../../../users/entities/user.entity';
import { AboutSectionService } from '../services/about-section.service';
import { CloudinaryService } from '../../../services/cloudinary.service';
import {
  CreateAboutSectionDto,
  UpdateAboutSectionDto,
} from '../dto/about-section.dto';

@ApiTags('CMS - Home - About Section')
@ApiBearerAuth('JWT-auth')
@Controller('cms/home/about-section')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AboutSectionController {
  private readonly logger = new Logger(AboutSectionController.name);

  constructor(
    private readonly aboutSectionService: AboutSectionService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get About Section',
    description:
      'Retrieves the homepage about section data. This endpoint is public and does not require authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'About section retrieved successfully',
    schema: {
      example: {
        success: true,
        message: 'About section retrieved successfully',
        data: {
          id: 'about',
          title: 'Passionate About Flight',
          subtitle: 'Meet Rich Pickett',
          description: '<p>About us description</p>',
          image: 'https://cloudinary.com/image.jpg',
          highlights: [],
          stats: [],
          cta: { label: 'Learn More', link: '/courses' },
          seo: {},
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'About section not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAboutSection() {
    try {
      this.logger.log('Fetching about section');
      const aboutSection = await this.aboutSectionService.getAboutSection();

      if (!aboutSection) {
        throw new NotFoundException(
          'About section not found. Please create one first.',
        );
      }

      return {
        success: true,
        message: 'About section retrieved successfully',
        data: aboutSection,
        meta: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch about section: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve about section',
          error:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update About Section',
    description:
      'Updates the homepage about section with new data. Requires admin authentication.',
  })
  @ApiBody({ type: UpdateAboutSectionDto })
  @ApiResponse({
    status: 200,
    description: 'About section updated successfully',
    schema: {
      example: {
        success: true,
        message: 'About section updated successfully',
        data: {
          id: 'about',
          title: 'Updated Title',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'About section not found',
  })
  async updateAboutSection(@Body() dto: UpdateAboutSectionDto) {
    try {
      this.logger.log(
        `Updating about section with data: ${JSON.stringify(dto)}`,
      );

      // Validate input
      if (!dto || Object.keys(dto).length === 0) {
        throw new BadRequestException('Update data cannot be empty');
      }

      const updatedSection =
        await this.aboutSectionService.updateAboutSection(dto);

      this.logger.log('About section updated successfully');
      return {
        success: true,
        message: 'About section updated successfully',
        data: updatedSection,
        meta: {
          timestamp: new Date().toISOString(),
          updatedFields: Object.keys(dto),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to update about section: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update about section',
          error:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('toggle-active')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Toggle Active Status',
    description: 'Toggles the active/inactive status of the about section',
  })
  @ApiResponse({
    status: 200,
    description: 'Status toggled successfully',
    schema: {
      example: {
        success: true,
        message: 'About section status toggled successfully',
        data: {
          id: 'about',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'About section not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async toggleActive() {
    try {
      this.logger.log('Toggling about section active status');
      const updatedSection = await this.aboutSectionService.toggleActive();

      this.logger.log(
        `About section status toggled to: ${updatedSection.isActive}`,
      );
      return {
        success: true,
        message: `About section ${updatedSection.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedSection,
        meta: {
          timestamp: new Date().toISOString(),
          newStatus: updatedSection.isActive,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to toggle about section status: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to toggle about section status',
          error:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('upload')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update About Section with Image Upload',
    description:
      'Updates the about section including file uploads for images. Supports multipart/form-data with progress tracking.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'About section updated successfully with media upload',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or data',
  })
  @ApiResponse({
    status: 413,
    description: 'File size too large',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async uploadMedia(
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    try {
      this.logger.log('Processing about section upload with media');
      this.logger.log(`Body type: ${typeof body}, Is object: ${body && typeof body === 'object'}`);
      this.logger.log(`Body constructor: ${body?.constructor?.name}`);
      this.logger.log(`Full body: ${JSON.stringify(body, null, 2)}`);
      this.logger.log(`FormData keys: ${JSON.stringify(Object.keys(body))}`);

      // Log all highlights keys
      const highlightKeys = Object.keys(body).filter(k => k.startsWith('highlights['));
      this.logger.log(`Highlight keys: ${highlightKeys.join(', ')}`);

      // Log all stats keys
      const statKeys = Object.keys(body).filter(k => k.startsWith('stats['));
      this.logger.log(`Stat keys: ${statKeys.join(', ')}`);

      // Log sample values
      if (highlightKeys.length > 0) {
        this.logger.log(`Sample highlight value [highlights[0][icon]]: ${body['highlights[0][icon]']}`);
      }
      if (statKeys.length > 0) {
        this.logger.log(`Sample stat value [stats[0][value]]: ${body['stats[0][value]']}`);
      }
      // Validate file if provided
      if (files?.image?.[0]) {
        const file = files.image[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
          'image/gif',
        ];

        if (file.size > maxSize) {
          throw new BadRequestException('File size exceeds 10MB limit');
        }

        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed',
          );
        }
      }

      // Handle image upload
      let imageUrl = body.image;
      if (files?.image?.[0]) {
        try {
          this.logger.log('Uploading image to Cloudinary');
          const result = await this.cloudinaryService.uploadImage(
            files.image[0],
          );
          imageUrl = result.url;
          this.logger.log('Image uploaded successfully');
        } catch (uploadError) {
          this.logger.error(
            'Failed to upload image to Cloudinary',
            uploadError.stack,
          );
          throw new HttpException(
            'Failed to upload image to cloud storage',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Parse highlights array - body parser auto-parses FormData into structured objects
      let highlights: Array<{ icon: string; label: string; text: string }> = [];

      // Check if highlights is already parsed as an array (modern body parser)
      if (Array.isArray(body.highlights)) {
        this.logger.log(`Using pre-parsed highlights array with ${body.highlights.length} items`);
        highlights = body.highlights.map((h: any) => ({
          icon: h.icon || '',
          label: h.label || '',
          text: h.text || '',
        }));
      }
      // Fallback: Check for old FormData indexed format
      else if (body['highlights[0][icon]']) {
        this.logger.log('Using indexed FormData format for highlights');
        let highlightIndex = 0;
        while (body[`highlights[${highlightIndex}][icon]`]) {
          highlights.push({
            icon: body[`highlights[${highlightIndex}][icon]`],
            label: body[`highlights[${highlightIndex}][label]`],
            text: body[`highlights[${highlightIndex}][text]`],
          });
          highlightIndex++;
        }
      }
      this.logger.log(`Parsed ${highlights.length} highlights`);

      // Parse stats array - body parser auto-parses FormData into structured objects
      let stats: Array<{ value: number; suffix: string; label: string }> = [];

      // Check if stats is already parsed as an array (modern body parser)
      if (Array.isArray(body.stats)) {
        this.logger.log(`Using pre-parsed stats array with ${body.stats.length} items`);
        stats = body.stats.map((s: any) => {
          const value = typeof s.value === 'number' ? s.value : parseInt(s.value);
          if (isNaN(value)) {
            throw new BadRequestException(`Invalid stat value: ${s.value}`);
          }
          return {
            value,
            suffix: s.suffix || '',
            label: s.label || '',
          };
        });
      }
      // Fallback: Check for old FormData indexed format
      else if (body['stats[0][value]']) {
        this.logger.log('Using indexed FormData format for stats');
        let statIndex = 0;
        while (body[`stats[${statIndex}][value]`]) {
          const value = parseInt(body[`stats[${statIndex}][value]`]);
          if (isNaN(value)) {
            throw new BadRequestException(`Invalid stat value at index ${statIndex}`);
          }
          stats.push({
            value,
            suffix: body[`stats[${statIndex}][suffix]`] || '',
            label: body[`stats[${statIndex}][label]`],
          });
          statIndex++;
        }
      }
      this.logger.log(`Parsed ${stats.length} stats`);

      // Parse CTA - check if already parsed or use indexed format
      let cta: { label: string; link: string };
      if (body.cta && typeof body.cta === 'object') {
        this.logger.log('Using pre-parsed CTA object');
        cta = {
          label: body.cta.label || '',
          link: body.cta.link || '',
        };
      } else {
        this.logger.log('Using indexed FormData format for CTA');
        cta = {
          label: body['cta[label]'] || '',
          link: body['cta[link]'] || '',
        };
      }

      // Validate required fields
      if (!body.title || !body.subtitle || !body.description) {
        throw new BadRequestException(
          'Title, subtitle, and description are required fields',
        );
      }

      // Parse SEO metadata - check if already parsed or use indexed format
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

      if (body.seo && typeof body.seo === 'object') {
        this.logger.log('Using pre-parsed SEO object');
        seo = {
          title: body.seo.title || '',
          description: body.seo.description || '',
          keywords: body.seo.keywords || '',
          ogImage: body.seo.ogImage || '',
          ogTitle: body.seo.ogTitle || '',
          ogDescription: body.seo.ogDescription || '',
          canonicalUrl: body.seo.canonicalUrl || '',
        };
      } else if (body['seo[title]']) {
        this.logger.log('Using indexed FormData format for SEO');
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

      this.logger.log(`Creating DTO with highlights: ${JSON.stringify(highlights)}`);
      this.logger.log(`Creating DTO with stats: ${JSON.stringify(stats)}`);
      this.logger.log('Upserting about section with parsed data');
      const result =
        await this.aboutSectionService.upsertAboutSection(createDto);

      this.logger.log(`Service returned highlights: ${JSON.stringify(result.highlights)}`);
      this.logger.log(`Service returned stats: ${JSON.stringify(result.stats)}`);
      this.logger.log('About section updated successfully with media');
      return {
        success: true,
        message: 'About section updated successfully with media upload',
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          imageUploaded: !!files?.image?.[0],
          highlightsCount: highlights.length,
          statsCount: stats.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to update about section with upload: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update about section with media',
          error:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('duplicate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Duplicate About Section',
    description:
      'Creates a copy of the current about section with a new ID. The duplicated section will be inactive by default.',
  })
  @ApiResponse({
    status: 201,
    description: 'About section duplicated successfully',
    schema: {
      example: {
        success: true,
        message: 'About section duplicated successfully',
        data: {
          id: 'about-1704067200000',
          isActive: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'About section not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async duplicate() {
    try {
      this.logger.log('Duplicating about section');
      const duplicated = await this.aboutSectionService.duplicate();

      this.logger.log(`About section duplicated with new ID: ${duplicated.id}`);
      return {
        success: true,
        message: 'About section duplicated successfully',
        data: duplicated,
        meta: {
          timestamp: new Date().toISOString(),
          originalId: 'about',
          newId: duplicated.id,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to duplicate about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to duplicate about section',
          error:
            process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Export About Section',
    description:
      'Exports the about section data in JSON or PDF format for backup or documentation purposes.',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'pdf'],
    required: false,
    description: 'Export format (defaults to json)',
  })
  @ApiResponse({
    status: 200,
    description: 'About section exported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid format specified',
  })
  @ApiResponse({
    status: 404,
    description: 'About section not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async export(
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      this.logger.log(`Exporting about section in ${format} format`);

      // Validate format
      if (!['json', 'pdf'].includes(format)) {
        throw new BadRequestException(
          'Invalid export format. Use "json" or "pdf"',
        );
      }

      const result = await this.aboutSectionService.export(format);

      if (format === 'pdf') {
        this.logger.log('Sending PDF export');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="about-section_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        res.setHeader('X-Export-Timestamp', new Date().toISOString());
        return res.send(result);
      }

      this.logger.log('Sending JSON export');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="about-section_${new Date().toISOString().split('T')[0]}.json"`,
      );
      res.setHeader('X-Export-Timestamp', new Date().toISOString());
      return res.json({
        success: true,
        message: 'About section exported successfully',
        ...result,
      });
    } catch (error) {
      this.logger.error(
        `Failed to export about section: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        return res.status(error.getStatus()).json({
          success: false,
          message: error.message,
          data: null,
        });
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message || 'Failed to export about section',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        data: null,
      });
    }
  }
}
