import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AboutUs, AboutUsSchema } from './schemas/about-us.schema';
import { AboutUsService } from './services/about-us.service';
import { AboutUsController } from './controllers/about-us.controller';
import { CloudinaryService } from '../services/cloudinary.service';
import { AboutUsSeeder } from './seeds/about-us.seed';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AboutUs.name, schema: AboutUsSchema }]),
  ],
  controllers: [AboutUsController],
  providers: [AboutUsService, CloudinaryService, AboutUsSeeder],
  exports: [AboutUsService, AboutUsSeeder],
})
export class AboutUsModule {}
