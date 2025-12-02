import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { File, FileSchema } from './entities/file.entity';
import { CloudinaryProvider } from './providers/cloudinary.provider';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, CloudinaryProvider],
  exports: [UploadsService],
})
export class UploadsModule {}
