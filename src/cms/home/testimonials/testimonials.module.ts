import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Testimonials,
  TestimonialsSchema,
} from './schemas/testimonials.schema';
import { TestimonialsService } from './services/testimonials.service';
import { TestimonialsController } from './controllers/testimonials.controller';
import { CloudinaryService } from '../../services/cloudinary.service';
import { TestimonialsSeeder } from './seeds/testimonials.seed';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Testimonials.name, schema: TestimonialsSchema },
    ]),
  ],
  controllers: [TestimonialsController],
  providers: [TestimonialsService, CloudinaryService, TestimonialsSeeder],
  exports: [TestimonialsService, TestimonialsSeeder],
})
export class TestimonialsModule {}
