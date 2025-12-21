import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PrivacyPolicyService } from '../services/privacy-policy.service';
import {
  CreatePrivacyPolicyDto,
  UpdatePrivacyPolicyDto,
} from '../dto/privacy-policy.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@Controller('cms/privacy-policy')
export class PrivacyPolicyController {
  constructor(
    private readonly privacyPolicyService: PrivacyPolicyService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  async create(@Body() createPrivacyPolicyDto: CreatePrivacyPolicyDto) {
    try {
      const privacyPolicy = await this.privacyPolicyService.create(
        createPrivacyPolicyDto,
      );
      return {
        success: true,
        message: 'Privacy policy created successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create privacy policy',
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const privacyPolicies = await this.privacyPolicyService.findAll();
      return {
        success: true,
        message: 'Privacy policies fetched successfully',
        data: privacyPolicies,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch privacy policies',
      };
    }
  }

  @Get('active')
  async findActive() {
    try {
      const privacyPolicy = await this.privacyPolicyService.findActive();
      if (!privacyPolicy) {
        return {
          success: false,
          message: 'No active privacy policy found',
        };
      }
      return {
        success: true,
        message: 'Active privacy policy fetched successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch active privacy policy',
      };
    }
  }

  @Get('default')
  async getDefault() {
    try {
      const privacyPolicy =
        await this.privacyPolicyService.getOrCreateDefault();
      return {
        success: true,
        message: 'Default privacy policy fetched successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch default privacy policy',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const privacyPolicy = await this.privacyPolicyService.findOne(id);
      if (!privacyPolicy) {
        return {
          success: false,
          message: 'Privacy policy not found',
        };
      }
      return {
        success: true,
        message: 'Privacy policy fetched successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch privacy policy',
      };
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePrivacyPolicyDto: UpdatePrivacyPolicyDto,
  ) {
    try {
      const privacyPolicy = await this.privacyPolicyService.update(
        id,
        updatePrivacyPolicyDto,
      );
      if (!privacyPolicy) {
        return {
          success: false,
          message: 'Privacy policy not found',
        };
      }
      return {
        success: true,
        message: 'Privacy policy updated successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update privacy policy',
      };
    }
  }

  @Put(':id/upload')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async updateWithUpload(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
  ) {
    try {
      const updateData: UpdatePrivacyPolicyDto = {};

      // Parse JSON fields from FormData
      if (body.headerSection) {
        updateData.headerSection =
          typeof body.headerSection === 'string'
            ? JSON.parse(body.headerSection)
            : body.headerSection;
      }

      if (body.lastUpdated) {
        updateData.lastUpdated = body.lastUpdated;
      }

      if (body.sections) {
        updateData.sections =
          typeof body.sections === 'string'
            ? JSON.parse(body.sections)
            : body.sections;
      }

      if (body.contactInfo) {
        updateData.contactInfo =
          typeof body.contactInfo === 'string'
            ? JSON.parse(body.contactInfo)
            : body.contactInfo;
      }

      if (body.seoMeta) {
        updateData.seoMeta =
          typeof body.seoMeta === 'string'
            ? JSON.parse(body.seoMeta)
            : body.seoMeta;
      }

      if (body.isActive !== undefined) {
        updateData.isActive =
          body.isActive === 'true' || body.isActive === true;
      }

      // Handle image upload if provided
      if (files?.image && files.image[0]) {
        const imageUrl = await this.cloudinaryService.uploadImage(
          files.image[0],
        );
        if (!updateData.headerSection) {
          updateData.headerSection = {} as any;
        }
        if (updateData.headerSection) {
          updateData.headerSection.image =
            typeof imageUrl === 'string' ? imageUrl : imageUrl.url;
        }
      }

      const privacyPolicy = await this.privacyPolicyService.update(
        id,
        updateData,
      );

      if (!privacyPolicy) {
        return {
          success: false,
          message: 'Privacy policy not found',
        };
      }

      return {
        success: true,
        message: 'Privacy policy updated successfully with image',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update privacy policy with upload',
      };
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const privacyPolicy = await this.privacyPolicyService.delete(id);
      if (!privacyPolicy) {
        return {
          success: false,
          message: 'Privacy policy not found',
        };
      }
      return {
        success: true,
        message: 'Privacy policy deleted successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete privacy policy',
      };
    }
  }

  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    try {
      const privacyPolicy = await this.privacyPolicyService.toggleActive(id);
      return {
        success: true,
        message: 'Privacy policy status toggled successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to toggle privacy policy status',
        data: null,
      };
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      const privacyPolicy = await this.privacyPolicyService.duplicate(id);
      return {
        success: true,
        message: 'Privacy policy duplicated successfully',
        data: privacyPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate privacy policy',
        data: null,
      };
    }
  }

  @Get(':id/export')
  async export(@Param('id') id: string, @Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.privacyPolicyService.export(id, format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="privacy-policy_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="privacy-policy_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export privacy policy',
        data: null,
      });
    }
  }

  @Get('export')
  async exportAll(@Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.privacyPolicyService.exportAll(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="privacy-policy-all_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="privacy-policy-all_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export privacy policy',
        data: null,
      });
    }
  }
}
