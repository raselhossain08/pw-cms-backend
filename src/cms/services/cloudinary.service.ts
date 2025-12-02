import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'cms',
  ): Promise<{ url: string; publicId: string }> {
    // Check if file is SVG
    const isSvg =
      file.mimetype === 'image/svg+xml' ||
      file.originalname.toLowerCase().endsWith('.svg');

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: `personal-wings/${folder}`,
        resource_type: isSvg ? 'raw' : 'auto',
      };

      // For SVG files, preserve the original filename with extension
      if (isSvg) {
        // Extract filename without extension and append timestamp for uniqueness
        const baseFilename = file.originalname.replace(/\.[^/.]+$/, '');
        const timestamp = Date.now();
        uploadOptions.public_id = `${baseFilename}-${timestamp}.svg`;
        uploadOptions.use_filename = false;
        uploadOptions.unique_filename = false;
      } else {
        // Only apply transformations to non-SVG images
        uploadOptions.transformation = [
          { width: 1200, height: 630, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ];
      }

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        })
        .end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'cms',
  ): Promise<Array<{ url: string; publicId: string }>> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  async deleteMultipleImages(publicIds: string[]): Promise<any> {
    return cloudinary.api.delete_resources(publicIds);
  }

  getOptimizedUrl(
    publicId: string,
    options?: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
    },
  ): string {
    return cloudinary.url(publicId, {
      ...options,
      secure: true,
    });
  }
}
