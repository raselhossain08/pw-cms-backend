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
      const updateDto: UpdateTestimonialsDto = {
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        isActive: body.isActive === 'true',
      };

      // Parse testimonials from form data
      if (body.testimonials) {
        const testimonials = JSON.parse(body.testimonials);

        // Upload new avatar images
        for (let i = 0; i < testimonials.length; i++) {
          const avatarKey = `avatar_${i}`;
          if (files[avatarKey] && files[avatarKey][0]) {
            const imageUrl = await this.testimonialsService.uploadImage(
              files[avatarKey][0],
            );
            testimonials[i].avatar = imageUrl;
          }
        }

        updateDto.testimonials = testimonials;
      }

      // Parse and update SEO
      if (body.seo) {
        updateDto.seo = JSON.parse(body.seo);
      }

      const result = await this.testimonialsService.update(updateDto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to update testimonials',
        HttpStatus.INTERNAL_SERVER_ERROR,
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
      const duplicated = await this.testimonialsService.duplicateTestimonial(parseInt(index));
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
  async export(@Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.testimonialsService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="testimonials_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="testimonials_${new Date().toISOString().split('T')[0]}.json"`);
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
