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
import { RefundPolicyService } from '../services/refund-policy.service';
import {
  CreateRefundPolicyDto,
  UpdateRefundPolicyDto,
} from '../dto/refund-policy.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@Controller('cms/refund-policy')
export class RefundPolicyController {
  constructor(
    private readonly refundPolicyService: RefundPolicyService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  async create(@Body() createRefundPolicyDto: CreateRefundPolicyDto) {
    try {
      const refundPolicy = await this.refundPolicyService.create(
        createRefundPolicyDto,
      );
      return {
        success: true,
        message: 'Refund policy created successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create refund policy',
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const refundPolicies = await this.refundPolicyService.findAll();
      return {
        success: true,
        message: 'Refund policies fetched successfully',
        data: refundPolicies,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch refund policies',
      };
    }
  }

  @Get('active')
  async findActive() {
    try {
      const refundPolicy = await this.refundPolicyService.findActive();
      return {
        success: true,
        message: 'Active refund policy fetched successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch active refund policy',
      };
    }
  }

  @Get('default')
  async getOrCreateDefault() {
    try {
      const refundPolicy = await this.refundPolicyService.getOrCreateDefault();
      return {
        success: true,
        message: 'Default refund policy fetched successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch default refund policy',
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const refundPolicy = await this.refundPolicyService.findOne(id);
      if (!refundPolicy) {
        return {
          success: false,
          message: 'Refund policy not found',
        };
      }
      return {
        success: true,
        message: 'Refund policy fetched successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch refund policy',
      };
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRefundPolicyDto: UpdateRefundPolicyDto,
  ) {
    try {
      const refundPolicy = await this.refundPolicyService.update(
        id,
        updateRefundPolicyDto,
      );
      if (!refundPolicy) {
        return {
          success: false,
          message: 'Refund policy not found',
        };
      }
      return {
        success: true,
        message: 'Refund policy updated successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update refund policy',
      };
    }
  }

  @Put(':id/upload')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async updateWithUpload(
    @Param('id') id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    try {
      const updateData: UpdateRefundPolicyDto = {};

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

      // Handle image upload
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

      const refundPolicy = await this.refundPolicyService.update(
        id,
        updateData,
      );

      if (!refundPolicy) {
        return {
          success: false,
          message: 'Refund policy not found',
        };
      }

      return {
        success: true,
        message: 'Refund policy updated successfully with image',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update refund policy with upload',
      };
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      const refundPolicy = await this.refundPolicyService.delete(id);
      if (!refundPolicy) {
        return {
          success: false,
          message: 'Refund policy not found',
        };
      }
      return {
        success: true,
        message: 'Refund policy deleted successfully',
        data: refundPolicy,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete refund policy',
      };
    }
  }
}
