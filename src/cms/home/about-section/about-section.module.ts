import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AboutSection,
  AboutSectionSchema,
} from './schemas/about-section.schema';
import { AboutSectionService } from './services/about-section.service';
import { AboutSectionController } from './controllers/about-section.controller';
import { CloudinaryService } from '../../services/cloudinary.service';
import { AboutSectionSeeder } from './seeds/about-section.seed';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AboutSection.name, schema: AboutSectionSchema },
    ]),
  ],
  controllers: [AboutSectionController],
  providers: [AboutSectionService, CloudinaryService, AboutSectionSeeder],
  exports: [AboutSectionService, AboutSectionSeeder],
})
export class AboutSectionModule {}
