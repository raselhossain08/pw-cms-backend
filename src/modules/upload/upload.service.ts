import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { UploadedFile, UploadedFileDocument } from './entities/uploaded-file.entity';
import { CloudinaryService } from './cloudinary.service';
import 'multer';

@Injectable()
export class UploadService {
    private readonly baseUploadPath = join(process.cwd(), 'uploads');
    private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
    private readonly allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'text/xml',
        'application/xml',
        'image/x-icon',
        'image/vnd.microsoft.icon'
    ];

    // Define folder structure for different upload types
    private readonly folderMap = {
        'footer': 'images/footer',
        'header': 'images/header',
        'blog': 'images/blog',
        'course': 'images/course',
        'gallery': 'images/gallery',
        'general': 'images'
    };

    constructor(
        @InjectModel(UploadedFile.name) private uploadedFileModel: Model<UploadedFileDocument>,
        private configService: ConfigService,
        private cloudinaryService: CloudinaryService
    ) {
        // Create upload directories if they don't exist (for local fallback)
        Object.values(this.folderMap).forEach(folder => {
            const fullPath = join(this.baseUploadPath, folder);
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    private getBaseUrl(): string {
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
        const port = this.configService.get<string>('PORT', '8000');

        // In production, use the actual domain
        if (nodeEnv === 'production') {
            return this.configService.get<string>('BASE_URL', 'https://cms.personalwings.site');
        }

        // In development, use localhost
        return `http://localhost:${port}`;
    }

    private shouldUseCloudinary(): boolean {
        // Use Cloudinary if configured and enabled
        const useCloudinary = this.configService.get<boolean>('USE_CLOUDINARY', true);
        return useCloudinary && this.cloudinaryService.isConfigured();
    } async uploadImage(file: Express.Multer.File, folder: string = 'general'): Promise<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
        id?: string;
        responsiveUrls?: any;
    }> {
        // Validate file
        this.validateFile(file);

        try {
            // Use Cloudinary if configured, otherwise fallback to local storage
            if (this.shouldUseCloudinary()) {
                return await this.uploadToCloudinary(file, folder);
            } else {
                return await this.uploadToLocal(file, folder);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            throw new BadRequestException(`Failed to upload image: ${error.message}`);
        }
    }

    private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
        id: string;
        responsiveUrls: any;
    }> {
        console.log(`☁️  Uploading to Cloudinary: ${file.originalname} to folder: ${folder}`);

        // Upload to Cloudinary
        const cloudinaryResult = await this.cloudinaryService.uploadImage(file, folder, {
            width: 1920,
            height: 1080,
            quality: 'auto:good'
        });

        // Check if this is a vector or XML file for proper handling
        const isVectorOrXml = this.isVectorOrXmlFile(file.mimetype);

        // Generate responsive URLs (only for image files, not SVG/XML)
        let responsiveUrls = {};
        if (!isVectorOrXml) {
            responsiveUrls = this.cloudinaryService.getResponsiveUrls(cloudinaryResult.public_id, folder);
        }

        // Save file information to database
        const uploadedFile = new this.uploadedFileModel({
            filename: isVectorOrXml ? file.originalname : `${cloudinaryResult.public_id}.${cloudinaryResult.format}`,
            originalName: file.originalname,
            mimetype: isVectorOrXml ? file.mimetype : `image/${cloudinaryResult.format}`,
            size: cloudinaryResult.bytes,
            url: cloudinaryResult.secure_url,
            cloudinaryPublicId: cloudinaryResult.public_id,
            cloudinarySecureUrl: cloudinaryResult.secure_url,
            storageType: 'cloudinary',
            width: cloudinaryResult.width || 0,
            height: cloudinaryResult.height || 0,
            format: isVectorOrXml ? file.originalname.split('.').pop() : cloudinaryResult.format,
            responsiveUrls: Object.keys(responsiveUrls).length > 0 ? responsiveUrls : undefined,
            folder,
            uploadedAt: new Date()
        });
        await uploadedFile.save();

        console.log(`✅ Cloudinary upload successful: ${cloudinaryResult.secure_url}`);

        return {
            url: cloudinaryResult.secure_url,
            originalName: file.originalname,
            size: cloudinaryResult.bytes,
            mimeType: isVectorOrXml ? file.mimetype : `image/${cloudinaryResult.format}`,
            id: uploadedFile._id.toString(),
            responsiveUrls: responsiveUrls
        };
    }

    private async uploadToLocal(file: Express.Multer.File, folder: string): Promise<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
        id?: string;
    }> {
        console.log(`💾 Uploading to local storage: ${file.originalname} to folder: ${folder}`);

        // Get folder path
        const folderPath = this.folderMap[folder] || this.folderMap['general'];
        const uploadPath = join(this.baseUploadPath, folderPath);

        // Ensure folder exists
        if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
        }

        // Check if file is SVG or XML (don't process with Sharp)
        const isVectorOrXml = this.isVectorOrXmlFile(file.mimetype);

        // Generate unique filename with folder prefix
        const timestamp = Date.now();
        const folderPrefix = folder === 'general' ? '' : `${folder}-`;
        const filename = `${folderPrefix}${timestamp}-${this.sanitizeFilename(file.originalname)}`;

        let outputFilename: string;
        let outputPath: string;
        let processedSize: number;
        let finalMimeType: string;

        if (isVectorOrXml) {
            // For SVG/XML files, keep original format
            outputFilename = filename;
            outputPath = join(uploadPath, outputFilename);

            // Save file directly without processing
            await require('fs').promises.writeFile(outputPath, file.buffer);
            processedSize = file.size;
            finalMimeType = file.mimetype;

            console.log(`✅ SVG/XML file saved directly: ${outputPath}`);
        } else {
            // For regular images, process with Sharp
            outputFilename = filename.replace(/\.[^/.]+$/, '.webp');
            outputPath = join(uploadPath, outputFilename);

            const processedImage = await sharp(file.buffer)
                .resize(1920, 1080, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(outputPath);

            processedSize = processedImage.size;
            finalMimeType = 'image/webp';

            console.log(`✅ Image processed with Sharp: ${outputPath}`);
        }

        // Create full URL with hostname for database storage
        const baseUrl = this.getBaseUrl();
        const relativePath = `/uploads/${folderPath}/${outputFilename}`;
        const fullUrl = `${baseUrl}${relativePath}`;

        // Save file information to database
        const uploadedFile = new this.uploadedFileModel({
            filename: outputFilename,
            originalName: file.originalname,
            mimetype: finalMimeType,
            size: processedSize,
            path: outputPath,
            url: fullUrl,
            storageType: 'local',
            folder,
            uploadedAt: new Date()
        });
        await uploadedFile.save();

        console.log(`✅ Local upload successful: ${fullUrl}`);

        return {
            url: fullUrl,
            originalName: file.originalname,
            size: processedSize,
            mimeType: finalMimeType,
            id: uploadedFile._id.toString()
        };
    }

    async uploadMultipleImages(files: Express.Multer.File[], folder: string = 'general'): Promise<Array<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
        id?: string;
        responsiveUrls?: any;
    }>> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        console.log(`📁 Uploading ${files.length} images to folder: ${folder} using ${this.shouldUseCloudinary() ? 'Cloudinary' : 'Local Storage'}`);

        // Upload all files in parallel
        const uploadPromises = files.map(file => this.uploadImage(file, folder));
        const results = await Promise.all(uploadPromises);

        console.log(`✅ Successfully uploaded ${results.length} images to ${folder}`);
        return results;
    }

    async getFiles(page: number = 1, limit: number = 20, search: string = '', type: string = '') {
        const skip = (page - 1) * limit;
        const query: any = {};

        // Search by filename or original name
        if (search) {
            query.$or = [
                { filename: { $regex: search, $options: 'i' } },
                { originalName: { $regex: search, $options: 'i' } }
            ];
        }

        // Filter by file type
        if (type) {
            const typeFilters = {
                image: { mimetype: { $regex: '^image/', $options: 'i' } },
                video: { mimetype: { $regex: '^video/', $options: 'i' } },
                audio: { mimetype: { $regex: '^audio/', $options: 'i' } },
                document: { mimetype: { $regex: '^application/', $options: 'i' } }
            };

            if (typeFilters[type]) {
                query.mimetype = typeFilters[type].mimetype;
            }
        }

        const [files, total] = await Promise.all([
            this.uploadedFileModel
                .find(query)
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.uploadedFileModel.countDocuments(query)
        ]);

        // Transform files - URLs are already full URLs stored in database
        const transformedFiles = files.map(file => ({
            id: file._id.toString(),
            filename: file.filename,
            originalName: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: file.url, // Use stored full URL directly
            storageType: file.storageType || 'local',
            responsiveUrls: file.responsiveUrls,
            width: file.width,
            height: file.height,
            format: file.format,
            uploadedAt: file.uploadedAt || new Date((file as any).createdAt)
        }));

        return {
            files: transformedFiles,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    async getFileById(id: string) {
        const file = await this.uploadedFileModel.findById(id).lean();
        if (!file) {
            return null;
        }

        return {
            id: file._id.toString(),
            filename: file.filename,
            originalName: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: file.url, // Use stored full URL directly
            uploadedAt: file.uploadedAt || new Date((file as any).createdAt),
            storageType: file.storageType || 'local',
            responsiveUrls: file.responsiveUrls
        };
    }

    async getFileDocument(id: string) {
        return await this.uploadedFileModel.findById(id).lean();
    }

    async deleteFile(id: string): Promise<boolean> {
        try {
            const file = await this.uploadedFileModel.findById(id);
            if (!file) {
                return false;
            }

            // Delete based on storage type
            if (file.storageType === 'cloudinary' && file.cloudinaryPublicId) {
                // Delete from Cloudinary
                console.log(`☁️  Deleting from Cloudinary: ${file.cloudinaryPublicId}`);
                const cloudinaryDeleted = await this.cloudinaryService.deleteImage(file.cloudinaryPublicId);

                if (!cloudinaryDeleted) {
                    console.warn(`⚠️  Failed to delete from Cloudinary: ${file.cloudinaryPublicId}`);
                }
            } else if (file.storageType === 'local' && file.path) {
                // Delete local file
                console.log(`💾 Deleting local file: ${file.path}`);
                const fullPath = file.path.startsWith('/') ? file.path : join(process.cwd(), file.path);
                if (existsSync(fullPath)) {
                    unlinkSync(fullPath);
                    console.log(`✅ Local file deleted: ${fullPath}`);
                } else {
                    console.warn(`⚠️  Local file not found: ${fullPath}`);
                }
            }

            // Delete from database
            await this.uploadedFileModel.findByIdAndDelete(id);
            console.log(`✅ Database record deleted: ${id}`);

            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new BadRequestException(`Failed to delete file: ${error.message}`);
        }
    }

    async migrateExistingFiles() {
        try {
            console.log('🔄 Starting migration of existing files...');

            const fs = await import('fs/promises');
            const path = await import('path');
            const mime = await import('mime-types');

            let migratedCount = 0;
            let skippedCount = 0;
            const errors: string[] = [];

            // Recursive function to scan directories
            const scanDirectory = async (dirPath: string, relativePath: string = '') => {
                try {
                    const items = await fs.readdir(dirPath, { withFileTypes: true });

                    for (const item of items) {
                        const fullPath = path.join(dirPath, item.name);
                        const relativeFilePath = relativePath ? `${relativePath}/${item.name}` : item.name;

                        if (item.isDirectory()) {
                            // Recursively scan subdirectories
                            await scanDirectory(fullPath, relativeFilePath);
                        } else if (item.isFile()) {
                            try {
                                // Get file stats
                                const stats = await fs.stat(fullPath);
                                const mimeType = mime.lookup(fullPath) || 'application/octet-stream';

                                // Check if file already exists in database
                                const existingFile = await this.uploadedFileModel.findOne({
                                    path: fullPath
                                });

                                if (existingFile) {
                                    skippedCount++;
                                    continue;
                                }

                                // Determine folder from path
                                let folder = 'general';
                                for (const [key, value] of Object.entries(this.folderMap)) {
                                    if (relativeFilePath.includes(value)) {
                                        folder = key;
                                        break;
                                    }
                                }

                                // Create full URL with hostname
                                const baseUrl = this.getBaseUrl();
                                const relativePath = `/uploads/${relativeFilePath.replace(/\\/g, '/')}`;
                                const fullUrl = `${baseUrl}${relativePath}`;

                                // Create database entry
                                const uploadedFile = new this.uploadedFileModel({
                                    filename: item.name,
                                    originalName: item.name,
                                    mimetype: mimeType,
                                    size: stats.size,
                                    path: fullPath,
                                    url: fullUrl, // Store full URL with hostname
                                    folder,
                                    uploadedAt: stats.birthtime || stats.ctime
                                });

                                await uploadedFile.save();
                                migratedCount++;

                                if (migratedCount % 10 === 0) {
                                    console.log(`📁 Migrated ${migratedCount} files...`);
                                }

                            } catch (fileError) {
                                console.error(`Error processing file ${fullPath}:`, fileError);
                                errors.push(`${item.name}: ${fileError.message}`);
                            }
                        }
                    }
                } catch (dirError) {
                    console.error(`Error scanning directory ${dirPath}:`, dirError);
                    errors.push(`Directory ${dirPath}: ${dirError.message}`);
                }
            };

            // Start scanning from uploads directory
            await scanDirectory(this.baseUploadPath);

            console.log(`✅ Migration completed: ${migratedCount} files migrated, ${skippedCount} skipped`);

            return {
                migratedCount,
                skippedCount,
                errors,
                success: true
            };

        } catch (error) {
            console.error('Migration failed:', error);
            throw new BadRequestException(`Migration failed: ${error.message}`);
        }
    }

    async getTotalFileCount(): Promise<number> {
        return this.uploadedFileModel.countDocuments();
    }

    async migrateUrlsToFullUrls() {
        try {
            console.log('🚀 Starting URL migration to full URLs...');

            // Get base URL
            const baseUrl = this.getBaseUrl();
            console.log(`🌐 Using base URL: ${baseUrl}`);

            // Find all files that have relative URLs (starting with /)
            const filesToUpdate = await this.uploadedFileModel.find({
                url: { $regex: '^/', $options: 'i' } // URLs starting with /
            }).lean();

            console.log(`📁 Found ${filesToUpdate.length} files with relative URLs to update`);

            if (filesToUpdate.length === 0) {
                return {
                    updatedCount: 0,
                    errorCount: 0,
                    errors: [],
                    message: 'No files need URL migration'
                };
            }

            let updatedCount = 0;
            let errorCount = 0;
            const errors: string[] = [];

            for (const file of filesToUpdate) {
                try {
                    const relativeUrl = file.url;
                    const fullUrl = `${baseUrl}${relativeUrl}`;

                    await this.uploadedFileModel.updateOne(
                        { _id: file._id },
                        { $set: { url: fullUrl } }
                    );

                    updatedCount++;

                    if (updatedCount % 10 === 0) {
                        console.log(`📝 Updated ${updatedCount}/${filesToUpdate.length} files...`);
                    }

                } catch (error) {
                    errorCount++;
                    const errorMsg = `Failed to update ${file.filename}: ${error.message}`;
                    console.error(`❌ ${errorMsg}`);
                    errors.push(errorMsg);
                }
            }

            console.log(`✅ URL migration completed: ${updatedCount} updated, ${errorCount} errors`);

            return {
                updatedCount,
                errorCount,
                errors,
                totalProcessed: filesToUpdate.length,
                success: true
            };

        } catch (error) {
            console.error('❌ URL migration failed:', error);
            throw new BadRequestException(`URL migration failed: ${error.message}`);
        }
    }

    async checkFileExists(filename: string): Promise<{
        exists: boolean;
        inDatabase: boolean;
        onFileSystem: boolean;
        possiblePaths: string[];
        databaseInfo?: any;
    }> {
        // Check if file exists in database
        const dbFile = await this.uploadedFileModel.findOne({
            $or: [
                { filename: filename },
                { originalName: filename },
                { filename: { $regex: filename, $options: 'i' } }
            ]
        }).lean();

        // Check possible file system paths
        const possiblePaths: string[] = [];
        const foundPaths: string[] = [];

        // Check all possible folder locations
        Object.values(this.folderMap).forEach(folder => {
            const fullPath = join(this.baseUploadPath, folder, filename);
            possiblePaths.push(fullPath);
            if (existsSync(fullPath)) {
                foundPaths.push(fullPath);
            }
        });

        // Also check root uploads directory
        const rootPath = join(this.baseUploadPath, filename);
        possiblePaths.push(rootPath);
        if (existsSync(rootPath)) {
            foundPaths.push(rootPath);
        }

        return {
            exists: foundPaths.length > 0,
            inDatabase: !!dbFile,
            onFileSystem: foundPaths.length > 0,
            possiblePaths: foundPaths.length > 0 ? foundPaths : possiblePaths,
            databaseInfo: dbFile ? {
                id: dbFile._id.toString(),
                url: dbFile.url, // URL is already stored as full URL with hostname
                path: dbFile.path,
                folder: dbFile.folder
            } : null
        };
    }

    private validateFile(file: Express.Multer.File): void {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`
            );
        }

        if (file.size > this.maxFileSize) {
            throw new BadRequestException(
                `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`
            );
        }
    }

    private sanitizeFilename(filename: string): string {
        return filename
            .toLowerCase()
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-');
    }

    /**
     * Check if file is SVG or XML that shouldn't be processed with Sharp
     */
    private isVectorOrXmlFile(mimetype: string): boolean {
        return mimetype === 'image/svg+xml' ||
            mimetype === 'text/xml' ||
            mimetype === 'application/xml';
    }
}
