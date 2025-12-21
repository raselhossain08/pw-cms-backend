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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AboutUsService } from '../services/about-us.service';
import {
  CreateAboutUsDto,
  UpdateAboutUsDto,
} from '../dto/about-us.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@Controller('cms/about-us')
export class AboutUsController {
  constructor(
    private readonly aboutUsService: AboutUsService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  async create(@Body() createAboutUsDto: CreateAboutUsDto) {
    try {
      const aboutUs = await this.aboutUsService.create(createAboutUsDto);
      return {
        success: true,
        message: 'About Us page created successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create About Us page',
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const aboutUsPages = await this.aboutUsService.findAll();
      return {
        success: true,
        message: 'About Us pages fetched successfully',
        data: aboutUsPages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch About Us pages',
      };
    }
  }

  @Get('active')
  async findActive() {
    try {
      const aboutUs = await this.aboutUsService.findActive();
      if (!aboutUs) {
        return {
          success: false,
          message: 'No active About Us page found',
        };
      }
      return {
        success: true,
        message: 'Active About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch active About Us page',
      };
    }
  }

  @Get('default')
  async getDefault() {
    try {
      const aboutUs = await this.aboutUsService.getOrCreateDefault();
      return {
        success: true,
        message: 'Default About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch default About Us page',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.findOne(id);
      if (!aboutUs) {
        return {
          success: false,
          message: 'About Us page not found',
        };
      }
      return {
        success: true,
        message: 'About Us page fetched successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch About Us page',
      };
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAboutUsDto: UpdateAboutUsDto,
  ) {
    try {
      const aboutUs = await this.aboutUsService.update(id, updateAboutUsDto);
      if (!aboutUs) {
        return {
          success: false,
          message: 'About Us page not found',
        };
      }
      return {
        success: true,
        message: 'About Us page updated successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update About Us page',
      };
    }
  }

  @Put(':id/upload')
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

      if (body.isActive !== undefined) {
        updateData.isActive =
          body.isActive === 'true' || body.isActive === true;
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
        return {
          success: false,
          message: 'About Us page not found',
        };
      }

      return {
        success: true,
        message: 'About Us page updated successfully with images',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update About Us page with upload',
      };
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.delete(id);
      if (!aboutUs) {
        return {
          success: false,
          message: 'About Us page not found',
        };
      }
      return {
        success: true,
        message: 'About Us page deleted successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete About Us page',
      };
    }
  }

  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.toggleActive(id);
      if (!aboutUs) {
        return {
          success: false,
          message: 'About Us page not found',
        };
      }
      return {
        success: true,
        message: `About Us page ${aboutUs.isActive ? 'activated' : 'deactivated'} successfully`,
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to toggle About Us page status',
      };
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      const aboutUs = await this.aboutUsService.duplicate(id);
      if (!aboutUs) {
        return {
          success: false,
          message: 'About Us page not found',
        };
      }
      return {
        success: true,
        message: 'About Us page duplicated successfully',
        data: aboutUs,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate About Us page',
      };
    }
  }
}
