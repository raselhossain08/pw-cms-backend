import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { UploadedFile, UploadedFileDocument } from './entities/uploaded-file.entity';
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
        'image/svg+xml'
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
        private configService: ConfigService
    ) {
        // Create upload directories if they don't exist
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

    async uploadImage(file: Express.Multer.File, folder: string = 'general'): Promise<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
    }> {
        // Validate file
        this.validateFile(file);

        // Get folder path
        const folderPath = this.folderMap[folder] || this.folderMap['general'];
        const uploadPath = join(this.baseUploadPath, folderPath);

        // Ensure folder exists
        if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
        }

        // Generate unique filename with folder prefix
        const timestamp = Date.now();
        const folderPrefix = folder === 'general' ? '' : `${folder}-`;
        const filename = `${folderPrefix}${timestamp}-${this.sanitizeFilename(file.originalname)}`;
        const outputFilename = filename.replace(/\.[^/.]+$/, '.webp');
        const outputPath = join(uploadPath, outputFilename);

        try {
            // Process image with sharp (convert to WebP, optimize)
            const processedImage = await sharp(file.buffer)
                .resize(1920, 1080, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(outputPath);

            // Return the exact path structure for database storage
            const urlPath = `/uploads/${folderPath}/${outputFilename}`;

            // Save file information to database
            const uploadedFile = new this.uploadedFileModel({
                filename: outputFilename,
                originalName: file.originalname,
                mimetype: 'image/webp',
                size: processedImage.size,
                path: outputPath,
                url: urlPath,
                folder,
                uploadedAt: new Date()
            });
            await uploadedFile.save();

            return {
                url: urlPath,
                originalName: file.originalname,
                size: processedImage.size,
                mimeType: 'image/webp'
            };
        } catch (error) {
            console.error('Image processing failed:', error);
            throw new BadRequestException('Failed to process image');
        }
    }

    async uploadMultipleImages(files: Express.Multer.File[], folder: string = 'general'): Promise<Array<{
        url: string;
        originalName: string;
        size: number;
        mimeType: string;
    }>> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        const uploadPromises = files.map(file => this.uploadImage(file, folder));
        return await Promise.all(uploadPromises);
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

        // Transform files to include proper URLs
        const baseUrl = this.getBaseUrl();
        const transformedFiles = files.map(file => ({
            id: file._id.toString(),
            filename: file.filename,
            originalName: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: `${baseUrl}${file.url}`, // Dynamic URL based on environment
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

        const baseUrl = this.getBaseUrl();
        return {
            id: file._id.toString(),
            filename: file.filename,
            originalName: file.originalName,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            url: `${baseUrl}${file.url}`,
            uploadedAt: file.uploadedAt || new Date((file as any).createdAt)
        };
    }

    async deleteFile(id: string): Promise<boolean> {
        try {
            const file = await this.uploadedFileModel.findById(id);
            if (!file) {
                return false;
            }

            // Delete physical file
            const fullPath = join(process.cwd(), file.path);
            if (existsSync(fullPath)) {
                unlinkSync(fullPath);
            }

            // Delete from database
            await this.uploadedFileModel.findByIdAndDelete(id);

            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw new BadRequestException('Failed to delete file');
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

                                // Create URL path
                                const urlPath = `/uploads/${relativeFilePath.replace(/\\/g, '/')}`;

                                // Create database entry
                                const uploadedFile = new this.uploadedFileModel({
                                    filename: item.name,
                                    originalName: item.name,
                                    mimetype: mimeType,
                                    size: stats.size,
                                    path: fullPath,
                                    url: urlPath,
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
                url: `${this.getBaseUrl()}${dbFile.url}`,
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
}
