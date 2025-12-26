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
import { TermsConditionsService } from './terms-conditions.service';
import {
  CreateTermsConditionsDto,
  UpdateTermsConditionsDto,
} from './dto/terms-conditions.dto';
import { CloudinaryService } from '../services/cloudinary.service';

@Controller('cms/terms-conditions')
export class TermsConditionsController {
  constructor(
    private readonly termsConditionsService: TermsConditionsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateTermsConditionsDto) {
    try {
      const termsConditions =
        await this.termsConditionsService.create(createDto);
      return {
        success: true,
        message: 'Terms & Conditions created successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to create Terms & Conditions',
        data: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const termsConditions = await this.termsConditionsService.findAll();
      return {
        success: true,
        message: 'Terms & Conditions retrieved successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve Terms & Conditions',
        data: null,
      };
    }
  }

  @Get('active')
  async findActive() {
    try {
      const termsConditions = await this.termsConditionsService.findActive();
      return {
        success: true,
        message: 'Active Terms & Conditions retrieved successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Failed to retrieve active Terms & Conditions',
        data: null,
      };
    }
  }

  @Get('default')
  async getDefault() {
    try {
      const termsConditions =
        await this.termsConditionsService.getOrCreateDefault();
      return {
        success: true,
        message: 'Default Terms & Conditions retrieved successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to get default Terms & Conditions',
        data: null,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const termsConditions = await this.termsConditionsService.findOne(id);
      return {
        success: true,
        message: 'Terms & Conditions retrieved successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to retrieve Terms & Conditions',
        data: null,
      };
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateTermsConditionsDto,
  ) {
    try {
      const termsConditions = await this.termsConditionsService.update(
        id,
        updateDto,
      );
      return {
        success: true,
        message: 'Terms & Conditions updated successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to update Terms & Conditions',
        data: null,
      };
    }
  }

  @Put(':id/upload')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async updateWithUpload(
    @Param('id') id: string,
    @UploadedFiles()
    files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    try {
      // Parse JSON fields from FormData
      const updateDto: UpdateTermsConditionsDto = {
        headerSection: body.headerSection
          ? JSON.parse(body.headerSection)
          : undefined,
        lastUpdated: body.lastUpdated,
        sections: body.sections ? JSON.parse(body.sections) : undefined,
        contactInfo: body.contactInfo
          ? JSON.parse(body.contactInfo)
          : undefined,
        seoMeta: body.seoMeta ? JSON.parse(body.seoMeta) : undefined,
        acceptanceSection: body.acceptanceSection
          ? JSON.parse(body.acceptanceSection)
          : undefined,
        isActive: body.isActive === 'true',
      };

      // Handle image upload
      if (files?.image?.[0]) {
        const imageUrl = await this.cloudinaryService.uploadImage(
          files.image[0],
          'terms-conditions',
        );
        if (updateDto.headerSection) {
          updateDto.headerSection.image = imageUrl.url || (imageUrl as any);
        } else {
          updateDto.headerSection = {
            title: body.headerSection
              ? JSON.parse(body.headerSection).title
              : '',
            subtitle: body.headerSection
              ? JSON.parse(body.headerSection).subtitle
              : '',
            image: imageUrl.url || (imageUrl as any),
            imageAlt: body.headerSection
              ? JSON.parse(body.headerSection).imageAlt
              : '',
          };
        }
      }

      const termsConditions = await this.termsConditionsService.update(
        id,
        updateDto,
      );
      return {
        success: true,
        message: 'Terms & Conditions updated successfully with image',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'Failed to update Terms & Conditions with image',
        data: null,
      };
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      await this.termsConditionsService.delete(id);
      return {
        success: true,
        message: 'Terms & Conditions deleted successfully',
        data: null,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to delete Terms & Conditions',
        data: null,
      };
    }
  }

  @Post(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    try {
      const termsConditions =
        await this.termsConditionsService.toggleActive(id);
      return {
        success: true,
        message: 'Terms & Conditions status toggled successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to toggle Terms & Conditions status',
        data: null,
      };
    }
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    try {
      const termsConditions = await this.termsConditionsService.duplicate(id);
      return {
        success: true,
        message: 'Terms & Conditions duplicated successfully',
        data: termsConditions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate Terms & Conditions',
        data: null,
      };
    }
  }

  @Get(':id/export')
  async export(
    @Param('id') id: string,
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      const result = await this.termsConditionsService.export(id, format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="terms-conditions_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="terms-conditions_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export Terms & Conditions',
        data: null,
      });
    }
  }

  @Get('export')
  async exportAll(
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      const result = await this.termsConditionsService.exportAll(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="terms-conditions-all_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="terms-conditions-all_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export Terms & Conditions',
        data: null,
      });
    }
  }
}
