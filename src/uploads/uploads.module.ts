import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { File, FileSchema } from './entities/file.entity';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { BunnyProvider } from './providers/bunny.provider';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
    MulterModule.register({
      storage: memoryStorage(),
      // No file size limits - especially for videos
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryProvider, BunnyProvider],
  exports: [UploadsService],
})
export class UploadsModule {}
