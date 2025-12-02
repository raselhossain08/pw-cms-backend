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
    const testimonials = await this.testimonialsModel.findOne().exec();

    if (!testimonials) {
      // If no testimonials exist, create a new one
      const newTestimonials = new this.testimonialsModel(updateTestimonialsDto);
      return newTestimonials.save();
    }

    Object.assign(testimonials, updateTestimonialsDto);
    return testimonials.save();
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
}
