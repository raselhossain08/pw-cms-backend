import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { UserRole } from '../../../users/entities/user.entity';
import { AboutUsService } from '../services/about-us.service';
import { CreateAboutUsDto, UpdateAboutUsDto } from '../dto/about-us.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@ApiTags('CMS - About Us')
@ApiBearerAuth('JWT-auth')
@Controller('cms/about-us')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AboutUsController {
  constructor(
    private readonly aboutUsService: AboutUsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create About Us page',
    description:
      'Creates a new About Us page with header, sections, team, stats, and SEO information',
  })
  @ApiResponse({
    status: 201,
    description: 'About Us page created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiBody({ type: CreateAboutUsDto })
  async create(@Body() createAboutUsDto: CreateAboutUsDto) {
    try {
      const aboutUs = await this.aboutUsService.create(createAboutUsDto);
      return {
        success: true,
        message: 'About Us page created successfully',
        data: aboutUs,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create About Us page',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all About Us pages',
    description: 'Retrieves all About Us pages from the database',
  })
  @ApiResponse({
    status: 200,
    description: 'About Us pages retrieved successfully',
  })
  async findAll() {
    try {
      const aboutUsPages = await this.aboutUsService.findAll();
      return {
        success: true,
        message: 'About Us pages fetched successfully',
        data: aboutUsPages,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch About Us pages',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('active')
  @Public()
  @ApiOperation({
    summary: 'Get About Us page (Public)',
    description:
      "Retrieves the About Us page or creates a default one if it doesn't exist - accessible without authentication",
  })
  @ApiResponse({
    status: 200,
    description: 'About Us page retrieved successfully',
  })
  async findActive() {
    try {
      const aboutUs = await this.aboutUsService.getOrCreateDefault();
      return {
        success: true,
        message: 'About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch About Us page',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get or create default About Us page',
    description:
      "Retrieves the default About Us page, creating one if it doesn't exist",
  })
  @ApiResponse({
    status: 200,
    description: 'Default About Us page retrieved or created successfully',
  })
  async getDefault() {
    try {
      const aboutUs = await this.aboutUsService.getOrCreateDefault();
      return {
        success: true,
        message: 'Default About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch default About Us page',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get About Us page by ID',
    description: 'Retrieves a specific About Us page by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'About Us page ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'About Us page retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'About Us page not found',
  })
  async findOne(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.findOne(id);
      if (!aboutUs) {
        throw new NotFoundException('About Us page not found');
      }
      return {
        success: true,
        message: 'About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch About Us page',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update About Us page',
    description: 'Updates an existing About Us page with new data',
  })
  @ApiParam({
    name: 'id',
    description: 'About Us page ID',
    type: String,
  })
  @ApiBody({ type: UpdateAboutUsDto })
  @ApiResponse({
    status: 200,
    description: 'About Us page updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'About Us page not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAboutUsDto: UpdateAboutUsDto,
  ) {
    try {
      const aboutUs = await this.aboutUsService.update(id, updateAboutUsDto);
      if (!aboutUs) {
        throw new NotFoundException('About Us page not found');
      }
      return {
        success: true,
        message: 'About Us page updated successfully',
        data: aboutUs,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update About Us page',
        },
        error instanceof BadRequestException
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/upload')
  @ApiOperation({
    summary: 'Update About Us page with file uploads',
    description:
      'Updates an About Us page including image uploads for header, sections, and team members',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'About Us page ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'About Us page updated successfully with images',
  })
  @ApiResponse({
    status: 404,
    description: 'About Us page not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file upload or data',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'headerImage', maxCount: 1 },
      { name: 'sectionImages', maxCount: 10 },
      { name: 'teamMemberImages', maxCount: 10 },
    ]),
  )
  async updateWithUpload(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles()
    files: {
      headerImage?: Express.Multer.File[];
      sectionImages?: Express.Multer.File[];
      teamMemberImages?: Express.Multer.File[];
    },
  ) {
    try {
      const updateData: UpdateAboutUsDto = {};

      // Parse JSON fields from FormData
      if (body.headerSection) {
        updateData.headerSection =
          typeof body.headerSection === 'string'
            ? JSON.parse(body.headerSection)
            : body.headerSection;
      }

      if (body.sections) {
        updateData.sections =
          typeof body.sections === 'string'
            ? JSON.parse(body.sections)
            : body.sections;
      }

      if (body.teamSection) {
        updateData.teamSection =
          typeof body.teamSection === 'string'
            ? JSON.parse(body.teamSection)
            : body.teamSection;
      }

      if (body.statsSection) {
        updateData.statsSection =
          typeof body.statsSection === 'string'
            ? JSON.parse(body.statsSection)
            : body.statsSection;
      }

      if (body.seo) {
        updateData.seo =
          typeof body.seo === 'string' ? JSON.parse(body.seo) : body.seo;
      }

      // Handle header image upload if provided
      if (files?.headerImage && files.headerImage[0]) {
        const imageUrl = await this.cloudinaryService.uploadImage(
          files.headerImage[0],
        );
        if (!updateData.headerSection) {
          updateData.headerSection = {} as any;
        }
        if (updateData.headerSection) {
          updateData.headerSection.image =
            typeof imageUrl === 'string' ? imageUrl : imageUrl.url;
        }
      }

      // Handle section images if provided
      if (files?.sectionImages && files.sectionImages.length > 0) {
        if (!updateData.sections) {
          updateData.sections = [];
        }
        // Note: This is a simplified approach. In production, you'd want to
        // match images to specific sections based on section IDs or indices
        for (let i = 0; i < files.sectionImages.length; i++) {
          const imageUrl = await this.cloudinaryService.uploadImage(
            files.sectionImages[i],
          );
          if (updateData.sections[i]) {
            updateData.sections[i].image =
              typeof imageUrl === 'string' ? imageUrl : imageUrl.url;
          }
        }
      }

      // Handle team member images if provided
      if (files?.teamMemberImages && files.teamMemberImages.length > 0) {
        if (!updateData.teamSection) {
          updateData.teamSection = { members: [] } as any;
        }
        // TypeScript now knows teamSection is defined after the check above
        const teamSection = updateData.teamSection!;
        if (!teamSection.members) {
          teamSection.members = [];
        }
        // Match images to team members by index
        for (let i = 0; i < files.teamMemberImages.length; i++) {
          const imageUrl = await this.cloudinaryService.uploadImage(
            files.teamMemberImages[i],
          );
          if (teamSection.members[i]) {
            teamSection.members[i].image =
              typeof imageUrl === 'string' ? imageUrl : imageUrl.url;
          }
        }
      }

      const aboutUs = await this.aboutUsService.update(id, updateData);

      if (!aboutUs) {
        throw new NotFoundException('About Us page not found');
      }

      return {
        success: true,
        message: 'About Us page updated successfully with images',
        data: aboutUs,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error.message || 'Failed to update About Us page with upload',
        },
        error instanceof BadRequestException
          ? HttpStatus.BAD_REQUEST
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete About Us page',
    description: 'Permanently deletes an About Us page',
  })
  @ApiParam({
    name: 'id',
    description: 'About Us page ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'About Us page deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'About Us page not found',
  })
  async delete(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.delete(id);
      if (!aboutUs) {
        throw new NotFoundException('About Us page not found');
      }
      return {
        success: true,
        message: 'About Us page deleted successfully',
        data: aboutUs,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete About Us page',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Export About Us page',
    description: 'Exports a specific About Us page in JSON or PDF format',
  })
  @ApiParam({
    name: 'id',
    description: 'About Us page ID',
    type: String,
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format (json or pdf)',
    enum: ['json', 'pdf'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'About Us page exported successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'About Us page not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export format',
  })
  async exportById(@Param('id') id: string, @Query('format') format: string) {
    try {
      const aboutUs = await this.aboutUsService.findOne(id);
      if (!aboutUs) {
        throw new NotFoundException('About Us page not found');
      }

      if (format === 'json') {
        return {
          success: true,
          message: 'About Us page exported successfully',
          data: aboutUs,
        };
      }

      // For PDF format, we would need a PDF generation library
      // This is a placeholder for now
      throw new BadRequestException('PDF export not implemented yet');
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to export About Us page',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export all About Us pages',
    description: 'Exports all About Us pages in JSON or PDF format',
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format (json or pdf)',
    enum: ['json', 'pdf'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'About Us pages exported successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export format',
  })
  async exportAll(@Query('format') format: string) {
    try {
      const aboutUsPages = await this.aboutUsService.findAll();

      if (format === 'json') {
        return {
          success: true,
          message: 'About Us pages exported successfully',
          data: aboutUsPages,
        };
      }

      // For PDF format, we would need a PDF generation library
      // This is a placeholder for now
      throw new BadRequestException('PDF export not implemented yet');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to export About Us pages',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
