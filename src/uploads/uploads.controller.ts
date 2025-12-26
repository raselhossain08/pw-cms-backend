import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Body,
  Query,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { File } from './entities/file.entity';
import { FileType } from './entities/file.entity';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        type: { type: 'string', enum: Object.values(FileType) },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        associatedEntity: { type: 'string' },
        entityType: { type: 'string' },
        visibility: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: File,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Req() req,
  ) {
    return this.uploadsService.uploadFile(file, uploadFileDto, req.user.id);
  }

  @Post('upload-from-url')
  @ApiOperation({ summary: 'Upload a file from URL' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', description: 'URL of the file to upload' },
        uploadFileDto: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(FileType) },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            associatedEntity: { type: 'string' },
            entityType: { type: 'string' },
            visibility: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully from URL',
    type: File,
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or file' })
  async uploadFromUrl(
    @Body() body: { url: string; uploadFileDto: UploadFileDto },
    @Req() req,
  ) {
    return this.uploadsService.uploadFromUrl(
      body.url,
      body.uploadFileDto,
      req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get user files with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
    example: 20,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: FileType,
    description: 'Filter by file type',
  })
  @ApiResponse({ status: 200, description: 'List of user files', type: [File] })
  async getUserFiles(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: FileType,
  ) {
    return this.uploadsService.getUserFiles(req.user.id, page, limit, type);
  }

  @Get('storage-stats')
  @ApiOperation({ summary: 'Get user storage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Storage statistics including total size and file count',
    schema: {
      type: 'object',
      properties: {
        totalFiles: { type: 'number' },
        totalSize: { type: 'number' },
        byType: { type: 'object' },
      },
    },
  })
  async getStorageStats(@Req() req) {
    return this.uploadsService.getStorageStats(req.user.id);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get files by associated entity' })
  @ApiParam({
    name: 'entityType',
    description: 'Type of entity (e.g., course, product, user)',
    example: 'course',
  })
  @ApiParam({
    name: 'entityId',
    description: 'ID of the entity',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'List of entity files',
    type: [File],
  })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getFilesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.uploadsService.getFilesByEntity(entityType, entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details by ID' })
  @ApiParam({
    name: 'id',
    description: 'File ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'File details', type: File })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(@Param('id') id: string) {
    return this.uploadsService.getFileById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update file metadata' })
  @ApiParam({
    name: 'id',
    description: 'File ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        visibility: { type: 'string', enum: ['public', 'private'] },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File metadata updated',
    type: File,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Not file owner' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFile(
    @Param('id') id: string,
    @Body() updateData: Partial<File>,
    @Req() req,
  ) {
    return this.uploadsService.updateFile(
      id,
      updateData,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file permanently' })
  @ApiParam({
    name: 'id',
    description: 'File ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not file owner' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('id') id: string, @Req() req) {
    return this.uploadsService.deleteFile(id, req.user.id, req.user.role);
  }

  @Post(':id/download')
  @ApiOperation({ summary: 'Track file download and increment counter' })
  @ApiParam({
    name: 'id',
    description: 'File ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({ status: 200, description: 'Download count incremented' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async incrementDownloadCount(@Param('id') id: string) {
    return this.uploadsService.incrementDownloadCount(id);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete multiple files' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileIds'],
      properties: {
        fileIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file IDs to delete',
          example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Files deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'number', description: 'Number of files deleted' },
        failed: {
          type: 'number',
          description: 'Number of files that failed to delete',
        },
        errors: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async bulkDeleteFiles(@Body() body: { fileIds: string[] }, @Req() req) {
    return this.uploadsService.bulkDeleteFiles(
      body.fileIds,
      req.user.id,
      req.user.role,
    );
  }

  @Get('search/query')
  @ApiOperation({ summary: 'Search files by name, tags, or description' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
    example: 'course',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: FileType,
    description: 'Filter by file type',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of results',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [File],
  })
  async searchFiles(
    @Query('q') query: string,
    @Query('type') type?: FileType,
    @Query('limit') limit: number = 20,
    @Req() req?,
  ) {
    return this.uploadsService.searchFiles(query, req.user.id, type, limit);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a file' })
  @ApiParam({
    name: 'id',
    description: 'File ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'File duplicated successfully',
    type: File,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async duplicateFile(@Param('id') id: string, @Req() req) {
    return this.uploadsService.duplicateFile(id, req.user.id);
  }

  @Post('bulk-update-visibility')
  @ApiOperation({ summary: 'Bulk update file visibility' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileIds', 'visibility'],
      properties: {
        fileIds: {
          type: 'array',
          items: { type: 'string' },
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Visibility updated successfully',
  })
  async bulkUpdateVisibility(
    @Body() body: { fileIds: string[]; visibility: 'public' | 'private' },
    @Req() req,
  ) {
    return this.uploadsService.bulkUpdateVisibility(
      body.fileIds,
      body.visibility,
      req.user.id,
      req.user.role,
    );
  }

  @Post('bulk-add-tags')
  @ApiOperation({ summary: 'Bulk add tags to files' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileIds', 'tags'],
      properties: {
        fileIds: {
          type: 'array',
          items: { type: 'string' },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tags added successfully',
  })
  async bulkAddTags(
    @Body() body: { fileIds: string[]; tags: string[] },
    @Req() req,
  ) {
    return this.uploadsService.bulkAddTags(
      body.fileIds,
      body.tags,
      req.user.id,
      req.user.role,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export files list' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['json', 'csv'],
    description: 'Export format',
  })
  @ApiResponse({
    status: 200,
    description: 'Files exported successfully',
  })
  async exportFiles(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const result = await this.uploadsService.exportFiles(req.user.id, format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="media-library-export_${new Date().toISOString().split('T')[0]}.csv"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="media-library-export_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export files',
      });
    }
  }
}
