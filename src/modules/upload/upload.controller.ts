import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
    BadRequestException,
    NotFoundException,
    Query
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { UploadResponseDto, MultipleUploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('image')
    @ApiOperation({ summary: 'Upload a single image' })
    @ApiConsumes('multipart/form-data')
    @ApiQuery({
        name: 'folder',
        required: false,
        description: 'Upload folder type (footer, header, blog, course, gallery, general)',
        enum: ['footer', 'header', 'blog', 'course', 'gallery', 'general']
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Image file (max 5MB, formats: jpg, png, webp, gif, svg)'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Image uploaded successfully',
        type: UploadResponseDto
    })
    @ApiResponse({ status: 400, description: 'Bad Request - Invalid file' })
    @UseInterceptors(FileInterceptor('file'))
    async uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder: string = 'general'
    ): Promise<UploadResponseDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        console.log(`📂 Uploading image to folder: ${folder}`);
        const result = await this.uploadService.uploadImage(file, folder);
        console.log(`✅ Image uploaded successfully: ${result.url}`);

        return result;
    }

    @Post('images')
    @ApiOperation({ summary: 'Upload multiple images' })
    @ApiConsumes('multipart/form-data')
    @ApiQuery({
        name: 'folder',
        required: false,
        description: 'Upload folder type (footer, header, blog, course, gallery, general)',
        enum: ['footer', 'header', 'blog', 'course', 'gallery', 'general']
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary'
                    },
                    description: 'Array of image files (max 5MB each)'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Images uploaded successfully',
        type: MultipleUploadResponseDto
    })
    @ApiResponse({ status: 400, description: 'Bad Request - Invalid files' })
    @UseInterceptors(FilesInterceptor('files', 10))
    async uploadMultipleImages(
        @UploadedFiles() files: Express.Multer.File[],
        @Query('folder') folder: string = 'general'
    ): Promise<MultipleUploadResponseDto> {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files provided');
        }

        console.log(`📂 Uploading ${files.length} images to folder: ${folder}`);
        const uploadedFiles = await this.uploadService.uploadMultipleImages(files, folder);
        console.log(`✅ ${files.length} images uploaded successfully to ${folder}`);

        return { files: uploadedFiles };
    }

    @Get('status')
    @ApiOperation({ summary: 'Check upload service status' })
    @ApiResponse({
        status: 200,
        description: 'Service status retrieved successfully'
    })
    async getStatus() {
        const totalFiles = await this.uploadService.getTotalFileCount();
        return {
            status: 'operational',
            totalFilesInDatabase: totalFiles,
            uploadsPath: 'uploads/',
            timestamp: new Date().toISOString()
        };
    }

    @Get('files')
    @ApiOperation({ summary: 'Get all uploaded files with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'search', required: false, description: 'Search by filename' })
    @ApiQuery({ name: 'type', required: false, description: 'Filter by file type (image, video, audio, document)' })
    @ApiResponse({
        status: 200,
        description: 'Files retrieved successfully'
    })
    async getFiles(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
        @Query('search') search: string = '',
        @Query('type') type: string = ''
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;

        return this.uploadService.getFiles(pageNum, limitNum, search, type);
    }

    @Get('files/:id')
    @ApiOperation({ summary: 'Get file information by ID' })
    @ApiParam({ name: 'id', description: 'File ID' })
    @ApiResponse({
        status: 200,
        description: 'File information retrieved successfully'
    })
    @ApiResponse({ status: 404, description: 'File not found' })
    async getFileById(@Param('id') id: string) {
        const file = await this.uploadService.getFileById(id);
        if (!file) {
            throw new NotFoundException('File not found');
        }
        return file;
    }

    @Delete('files/:id')
    @ApiOperation({ summary: 'Delete a file by ID' })
    @ApiParam({ name: 'id', description: 'File ID' })
    @ApiResponse({
        status: 200,
        description: 'File deleted successfully'
    })
    @ApiResponse({ status: 404, description: 'File not found' })
    async deleteFile(@Param('id') id: string) {
        const result = await this.uploadService.deleteFile(id);
        if (!result) {
            throw new NotFoundException('File not found');
        }
        return { message: 'File deleted successfully' };
    }

    @Post('migrate-existing-files')
    @ApiOperation({
        summary: 'Migrate existing files to database',
        description: 'Scans the uploads directory and adds existing files to the database'
    })
    @ApiResponse({
        status: 201,
        description: 'Files migrated successfully'
    })
    async migrateExistingFiles() {
        const result = await this.uploadService.migrateExistingFiles();
        return {
            message: 'Migration completed',
            ...result
        };
    }
}
