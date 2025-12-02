import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryProvider {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    options: {
      folder?: string;
      resource_type?: 'image' | 'video' | 'raw' | 'auto';
      transformation?: any[];
    } = {},
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: options.resource_type || 'auto',
          folder: options.folder || 'personal-wings',
          transformation: options.transformation,
        },
        (error, result) => {
          if (error) {
            reject(
              new BadRequestException(
                `Cloudinary upload failed: ${error.message}`,
              ),
            );
          } else {
            resolve(result);
          }
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  async uploadFromUrl(
    url: string,
    options: {
      folder?: string;
      public_id?: string;
      resource_type?: 'image' | 'video' | 'raw' | 'auto';
    } = {},
  ): Promise<any> {
    try {
      const result = await cloudinary.uploader.upload(url, {
        resource_type: options.resource_type || 'auto',
        folder: options.folder || 'personal-wings',
        public_id: options.public_id,
      });

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Cloudinary URL upload failed: ${error.message}`,
      );
    }
  }

  async deleteFile(
    publicId: string,
    resourceType: string = 'image',
  ): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Cloudinary delete failed: ${error.message}`,
      );
    }
  }

  async generateSignedUrl(
    publicId: string,
    options: any = {},
  ): Promise<string> {
    return cloudinary.utils.private_download_url(
      publicId,
      options.format,
      options,
    );
  }

  async getResource(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Cloudinary resource fetch failed: ${error.message}`,
      );
    }
  }
}
