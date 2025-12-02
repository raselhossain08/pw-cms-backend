import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Footer, FooterSchema } from './schemas/footer.schema';
import { FooterService } from './services/footer.service';
import { FooterController } from './controllers/footer.controller';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Footer.name, schema: FooterSchema }]),
  ],
  controllers: [FooterController],
  providers: [FooterService, CloudinaryService],
  exports: [FooterService],
})
export class FooterModule {}
