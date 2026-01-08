import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { TestimonialsService } from '../services/testimonials.service';
import {
  CreateTestimonialsDto,
  UpdateTestimonialsDto,
} from '../dto/testimonials.dto';

@ApiTags('Testimonials')
@Controller('cms/home/testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) { }

  @Get()
  @ApiOperation({ summary: 'Get testimonials' })
  @ApiResponse({
    status: 200,
    description: 'Testimonials retrieved successfully',
  })
  async getTestimonials() {
    try {
      const testimonials = await this.testimonialsService.findOne();
      return {
        success: true,
        data: testimonials,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch testimonials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create testimonials' })
  @ApiResponse({
    status: 201,
    description: 'Testimonials created successfully',
  })
  async createTestimonials(
    @Body() createTestimonialsDto: CreateTestimonialsDto,
  ) {
    try {
      const testimonials = await this.testimonialsService.create(
        createTestimonialsDto,
      );
      return {
        success: true,
        data: testimonials,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to create testimonials',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar_0', maxCount: 1 },
      { name: 'avatar_1', maxCount: 1 },
      { name: 'avatar_2', maxCount: 1 },
      { name: 'avatar_3', maxCount: 1 },
      { name: 'avatar_4', maxCount: 1 },
      { name: 'avatar_5', maxCount: 1 },
      { name: 'avatar_6', maxCount: 1 },
      { name: 'avatar_7', maxCount: 1 },
      { name: 'avatar_8', maxCount: 1 },
      { name: 'avatar_9', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update testimonials with media' })
  @ApiResponse({
    status: 200,
    description: 'Testimonials updated successfully',
  })
  async updateTestimonials(
    @Body() body: any,
    @UploadedFiles() files: { [key: string]: Express.Multer.File[] },
  ) {
    try {
      console.log('Received update request');
      console.log('Body:', body);
      console.log('Files:', Object.keys(files || {}));

      const updateDto: UpdateTestimonialsDto = {};

      // Only add fields that are provided
      if (body.title !== undefined && body.title !== null) {
        updateDto.title = body.title;
      }
      if (body.subtitle !== undefined && body.subtitle !== null) {
        updateDto.subtitle = body.subtitle;
      }
      if (body.description !== undefined && body.description !== null) {
        updateDto.description = body.description;
      }

      // Parse testimonials from form data
      if (body.testimonials) {
        try {
          const testimonials = JSON.parse(body.testimonials);
          console.log('Parsed testimonials:', testimonials.length);

          // Upload new avatar images
          if (files && Object.keys(files).length > 0) {
            for (let i = 0; i < testimonials.length; i++) {
              const avatarKey = `avatar_${i}`;
              if (files[avatarKey] && files[avatarKey][0]) {
                console.log(`Uploading avatar for index ${i}`);
                const imageUrl = await this.testimonialsService.uploadImage(
                  files[avatarKey][0],
                );
                testimonials[i].avatar = imageUrl;
              }
            }
          }

          updateDto.testimonials = testimonials;
        } catch (parseError) {
          console.error('Error parsing testimonials:', parseError);
          throw new HttpException(
            'Invalid testimonials data format',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Parse and update SEO
      if (body.seo) {
        try {
          updateDto.seo = JSON.parse(body.seo);
        } catch (parseError) {
          console.error('Error parsing SEO:', parseError);
          // Continue without SEO if it fails
        }
      }

      console.log('Calling service update with:', updateDto);
      const result = await this.testimonialsService.update(updateDto);
      console.log('Update successful');

      return {
        success: true,
        data: result,
        message: 'Testimonials updated successfully',
      };
    } catch (error) {
      console.error('Error updating testimonials:', error);
      console.error('Error stack:', error.stack);
      throw new HttpException(
        error.message || 'Failed to update testimonials',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('toggle-active')
  @ApiOperation({ summary: 'Toggle testimonials active status' })
  @ApiResponse({
    status: 200,
    description: 'Active status toggled successfully',
  })
  async toggleActive() {
    try {
      const testimonials = await this.testimonialsService.toggleActive();
      return {
        success: true,
        data: testimonials,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to toggle active status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':index/duplicate')
  @ApiOperation({ summary: 'Duplicate Testimonial' })
  async duplicateTestimonial(@Param('index') index: string) {
    try {
      const duplicated = await this.testimonialsService.duplicateTestimonial(
        parseInt(index),
      );
      return {
        success: true,
        message: 'Testimonial duplicated successfully',
        data: duplicated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate testimonial',
        data: null,
      };
    }
  }

  @Get('export')
  @ApiOperation({ summary: 'Export Testimonials' })
  async export(
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      const result = await this.testimonialsService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="testimonials_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="testimonials_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export testimonials',
        data: null,
      });
    }
  }
}
