import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Testimonials } from '../schemas/testimonials.schema';
import {
  CreateTestimonialsDto,
  UpdateTestimonialsDto,
} from '../dto/testimonials.dto';
import { CloudinaryService } from '../../../services/cloudinary.service';

@Injectable()
export class TestimonialsService {
  constructor(
    @InjectModel(Testimonials.name)
    private testimonialsModel: Model<Testimonials>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createTestimonialsDto: CreateTestimonialsDto,
  ): Promise<Testimonials> {
    const createdTestimonials = new this.testimonialsModel(
      createTestimonialsDto,
    );
    return createdTestimonials.save();
  }

  async findOne(): Promise<Testimonials | null> {
    return this.testimonialsModel.findOne().exec();
  }

  async update(
    updateTestimonialsDto: UpdateTestimonialsDto,
  ): Promise<Testimonials> {
    try {
      let testimonials = await this.testimonialsModel.findOne().exec();

      if (!testimonials) {
        // If no testimonials exist, create a new one
        console.log('Creating new testimonials document');
        testimonials = new this.testimonialsModel(updateTestimonialsDto);
      } else {
        // Update existing document - only update provided fields
        console.log('Updating existing testimonials document');
        if (updateTestimonialsDto.title !== undefined) {
          testimonials.title = updateTestimonialsDto.title;
        }
        if (updateTestimonialsDto.subtitle !== undefined) {
          testimonials.subtitle = updateTestimonialsDto.subtitle;
        }
        if (updateTestimonialsDto.description !== undefined) {
          testimonials.description = updateTestimonialsDto.description;
        }
        if (updateTestimonialsDto.testimonials !== undefined) {
          // Map testimonials and provide defaults for optional fields
          testimonials.testimonials = updateTestimonialsDto.testimonials.map(
            (t) => ({
              name: t.name || '',
              position: t.position || '',
              company: t.company || '',
              avatar: t.avatar || '',
              rating: t.rating || 5,
              comment: t.comment || '',
              fallback: t.fallback || '',
            }),
          );
        }
        if (updateTestimonialsDto.seo !== undefined) {
          // Provide defaults for optional SEO fields
          testimonials.seo = {
            title: updateTestimonialsDto.seo.title || '',
            description: updateTestimonialsDto.seo.description || '',
            keywords: updateTestimonialsDto.seo.keywords || '',
            ogImage: updateTestimonialsDto.seo.ogImage || '',
          };
        }
      }

      const saved = await testimonials.save();
      console.log('Testimonials saved successfully');
      return saved;
    } catch (error) {
      console.error('Error in update service:', error);
      throw error;
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const result = await this.cloudinaryService.uploadImage(
      file,
      'testimonials',
    );
    return result.url;
  }

  async toggleActive(): Promise<Testimonials> {
    const testimonials = await this.testimonialsModel.findOne().exec();
    if (!testimonials) {
      throw new NotFoundException('Testimonials not found');
    }
    testimonials.isActive = !testimonials.isActive;
    return testimonials.save();
  }

  /**
   * Duplicate a testimonial
   */
  async duplicateTestimonial(index: number): Promise<Testimonials> {
    const testimonials = await this.testimonialsModel.findOne().exec();

    if (!testimonials) {
      throw new NotFoundException('Testimonials not found');
    }

    if (
      !testimonials.testimonials ||
      index < 0 ||
      index >= testimonials.testimonials.length
    ) {
      throw new NotFoundException('Testimonial not found');
    }

    // Create a duplicate
    const testimonial = testimonials.testimonials[index];
    const duplicatedTestimonial = {
      ...JSON.parse(JSON.stringify(testimonial)),
      name: `${testimonial.name} (Copy)`,
    };

    testimonials.testimonials.push(duplicatedTestimonial);
    await testimonials.save();
    return testimonials;
  }

  /**
   * Export testimonials
   */
  async export(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const testimonials = await this.testimonialsModel.findOne().exec();

    if (!testimonials) {
      throw new NotFoundException('Testimonials not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(testimonials, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      testimonials,
    };
  }
}
