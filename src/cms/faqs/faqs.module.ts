import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Faqs, FaqsSchema } from './schemas/faqs.schema';
import { FaqsService } from './services/faqs.service';
import { FaqsController } from './controllers/faqs.controller';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Faqs.name, schema: FaqsSchema }]),
  ],
  controllers: [FaqsController],
  providers: [FaqsService, CloudinaryService],
  exports: [FaqsService],
})
export class FaqsModule {}
