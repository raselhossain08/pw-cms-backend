import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { BannerService } from './services/banner.service';
import { BannerController } from './controllers/banner.controller';
import { CloudinaryService } from '../../services/cloudinary.service';
import { BannerSeeder } from './seeds/banner.seed';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Banner.name, schema: BannerSchema }]),
  ],
  controllers: [BannerController],
  providers: [BannerService, CloudinaryService, BannerSeeder],
  exports: [BannerService, BannerSeeder],
})
export class BannerModule {
  constructor() {
    console.log('✅ BannerModule loaded - Controllers registered');
  }
}
