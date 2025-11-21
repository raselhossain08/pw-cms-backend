import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
    public_id: string;
    url: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    created_at: string;
    folder?: string;
}

@Injectable()
export class CloudinaryService {
    constructor(private configService: ConfigService) {
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    /**
     * Upload image to Cloudinary with optimization
     */
    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'general',
        options: {
            width?: number;
            height?: number;
            crop?: string;
            quality?: string | number;
            format?: string;
        } = {}
    ): Promise<CloudinaryUploadResult> {
        try {
            // Determine resource type based on file
            const isVector = this.isVectorFile(file.mimetype);
            const isXmlFile = this.isXmlFile(file.mimetype);

            let uploadOptions: any = {
                folder: `cms/${folder}`, // Organize in folders
                public_id: this.generatePublicId(file.originalname, folder),
                overwrite: true,
                secure: true, // Always use HTTPS

                // SEO and accessibility
                context: {
                    original_name: file.originalname,
                    upload_date: new Date().toISOString(),
                    folder: folder,
                    size: file.size.toString()
                }
            };

            if (isVector || isXmlFile) {
                // For SVG and XML files, upload as raw - preserve original filename and extension
                uploadOptions.resource_type = 'raw';
                // Keep the original extension in the public_id for proper file recognition
                const fileExtension = file.originalname.split('.').pop();
                uploadOptions.public_id = `${folder}-${Date.now()}-${this.sanitizeFilename(file.originalname.replace(/\.[^/.]+$/, ''))}.${fileExtension}`;
                // Don't apply any transformations to preserve exact file
            } else {
                // For regular images, apply optimizations
                uploadOptions.resource_type = 'image';
                uploadOptions.width = options.width || 1920;
                uploadOptions.height = options.height || 1080;
                uploadOptions.crop = options.crop || 'limit';
                uploadOptions.quality = options.quality || 'auto:good';
                uploadOptions.fetch_format = 'auto';
                uploadOptions.flags = 'progressive';
            }

            // Upload to Cloudinary
            const result: UploadApiResponse = await new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result!);
                    }
                ).end(file.buffer);
            });

            return {
                public_id: result.public_id,
                url: result.url,
                secure_url: result.secure_url,
                width: result.width || 0,
                height: result.height || 0,
                format: result.format,
                bytes: result.bytes,
                created_at: result.created_at,
                folder: folder
            };

        } catch (error) {
            console.error('Cloudinary upload failed:', error);
            throw new BadRequestException(`Failed to upload file to Cloudinary: ${error.message}`);
        }
    }    /**
     * Upload multiple images to Cloudinary
     */
    async uploadMultipleImages(
        files: Express.Multer.File[],
        folder: string = 'general',
        options: any = {}
    ): Promise<CloudinaryUploadResult[]> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        // Upload all files in parallel
        const uploadPromises = files.map(file => this.uploadImage(file, folder, options));
        return Promise.all(uploadPromises);
    }

    /**
     * Delete image from Cloudinary
     */
    async deleteImage(publicId: string): Promise<boolean> {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result.result === 'ok';
        } catch (error) {
            console.error('Cloudinary delete failed:', error);
            return false;
        }
    }

    /**
     * Get optimized image URL with transformations
     */
    getOptimizedUrl(publicId: string, transformations: {
        width?: number;
        height?: number;
        crop?: string;
        quality?: string | number;
        format?: string;
        effects?: string[];
    } = {}): string {
        const transformationString = this.buildTransformationString(transformations);
        return cloudinary.url(publicId, {
            transformation: transformationString,
            secure: true,
            fetch_format: 'auto',
            quality: transformations.quality || 'auto:good'
        });
    }

    /**
     * Get multiple sized URLs for responsive images
     */
    getResponsiveUrls(publicId: string, folder: string = 'general'): {
        thumbnail: string; // 150px
        small: string;     // 300px
        medium: string;    // 600px
        large: string;     // 1200px
        original: string;  // Full size
    } {
        const baseTransforms = { fetch_format: 'auto', quality: 'auto:good' };

        return {
            thumbnail: cloudinary.url(publicId, {
                ...baseTransforms,
                width: 150,
                height: 150,
                crop: 'fill',
                secure: true
            }),
            small: cloudinary.url(publicId, {
                ...baseTransforms,
                width: 300,
                crop: 'limit',
                secure: true
            }),
            medium: cloudinary.url(publicId, {
                ...baseTransforms,
                width: 600,
                crop: 'limit',
                secure: true
            }),
            large: cloudinary.url(publicId, {
                ...baseTransforms,
                width: 1200,
                crop: 'limit',
                secure: true
            }),
            original: cloudinary.url(publicId, {
                ...baseTransforms,
                secure: true
            })
        };
    }

    /**
     * Check if Cloudinary is properly configured
     */
    isConfigured(): boolean {
        const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

        return !!(cloudName && apiKey && apiSecret);
    }

    /**
     * Get Cloudinary usage stats
     */
    async getUsageStats(): Promise<any> {
        try {
            return await cloudinary.api.usage();
        } catch (error) {
            console.error('Failed to get Cloudinary usage stats:', error);
            return null;
        }
    }

    /**
     * Check if file is a vector file (SVG)
     */
    private isVectorFile(mimetype: string): boolean {
        return mimetype === 'image/svg+xml';
    }

    /**
     * Check if file is an XML file
     */
    private isXmlFile(mimetype: string): boolean {
        return mimetype === 'text/xml' || mimetype === 'application/xml';
    }

    /**
     * Generate a unique public ID for Cloudinary
     */
    private generatePublicId(originalName: string, folder: string): string {
        const timestamp = Date.now();
        const sanitizedName = this.sanitizeFilename(originalName);
        const folderPrefix = folder === 'general' ? '' : `${folder}-`;

        // Remove file extension for public ID
        const nameWithoutExt = sanitizedName.replace(/\.[^/.]+$/, '');
        return `${folderPrefix}${timestamp}-${nameWithoutExt}`;
    }

    /**
     * Sanitize filename for Cloudinary
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Build transformation string for Cloudinary URLs
     */
    private buildTransformationString(transformations: any): string {
        const transforms: string[] = [];

        if (transformations.width) transforms.push(`w_${transformations.width}`);
        if (transformations.height) transforms.push(`h_${transformations.height}`);
        if (transformations.crop) transforms.push(`c_${transformations.crop}`);
        if (transformations.quality) transforms.push(`q_${transformations.quality}`);
        if (transformations.format) transforms.push(`f_${transformations.format}`);
        if (transformations.effects) {
            transforms.push(...transformations.effects);
        }

        return transforms.join(',');
    }
}