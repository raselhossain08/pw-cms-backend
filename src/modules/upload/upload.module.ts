import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryService } from './cloudinary.service';
import { UploadedFile, UploadedFileSchema } from './entities/uploaded-file.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UploadedFile.name, schema: UploadedFileSchema }
        ])
    ],
    controllers: [UploadController],
    providers: [UploadService, CloudinaryService],
    exports: [UploadService, CloudinaryService]
})
export class UploadModule { }
