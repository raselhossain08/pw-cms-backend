import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { File, FileType, FileStatus } from './entities/file.entity';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { BunnyProvider } from './providers/bunny.provider';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private configService: ConfigService,
    private cloudinaryProvider: CloudinaryProvider,
    private bunnyProvider: BunnyProvider,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
    userId: string,
  ): Promise<File> {
    // Validate file type first
    const fileType = uploadFileDto.type || this.detectFileType(file.mimetype);

    // Validate file size (skip for videos - no limit)
    if (fileType !== 'video') {
      const maxFileSize = this.configService.get<number>(
        'MAX_FILE_SIZE',
        5242880,
      );
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB`,
        );
      }
    }

    // Validate file type
    const allowedTypes = this.getAllowedMimeTypes(fileType);
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed for ${fileType} uploads`,
      );
    }

    try {
      let uploadResult: any;
      if (fileType === FileType.VIDEO && this.getVideoProvider() === 'bunny') {
        uploadResult = await this.bunnyProvider.uploadFile(file, {
          title: file.originalname,
        });
      } else if (
        fileType !== FileType.VIDEO &&
        this.getGeneralProvider() === 'bunny'
      ) {
        uploadResult = await this.bunnyProvider.uploadFileToStorage(file, {
          folder: this.getUploadFolder(fileType),
          fileName: file.originalname,
        });
      } else {
        uploadResult = await this.cloudinaryProvider.uploadFile(file, {
          folder: this.getUploadFolder(fileType),
          resource_type: this.getResourceType(file.mimetype),
        });
      }

      // Create file record
      const fileRecord = new this.fileModel({
        originalName: file.originalname,
        fileName: uploadResult.public_id,
        mimeType: file.mimetype,
        size: file.size,
        type: uploadFileDto.type || this.detectFileType(file.mimetype),
        status: FileStatus.COMPLETED,
        path: uploadResult.secure_url,
        url: uploadResult.secure_url,
        uploadedBy: new Types.ObjectId(userId),
        description: uploadFileDto.description,
        tags: uploadFileDto.tags || [],
        altText: uploadFileDto.altText,
        caption: uploadFileDto.caption,
        folder: uploadFileDto.folder,
        metadata: this.extractMetadata(uploadResult, file.mimetype),
        visibility: uploadFileDto.visibility || 'public',
        processedAt: new Date(),
        associatedEntity: uploadFileDto.associatedEntity,
        entityType: uploadFileDto.entityType,
      });

      return await fileRecord.save();
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async uploadFromUrl(
    url: string,
    uploadFileDto: UploadFileDto,
    userId: string,
  ): Promise<File> {
    try {
      const fileType = uploadFileDto.type || FileType.OTHER;
      let uploadResult: any;
      if (fileType === FileType.VIDEO && this.getVideoProvider() === 'bunny') {
        uploadResult = await this.bunnyProvider.uploadFromUrl(url, {
          title: 'video',
        });
      } else if (
        fileType !== FileType.VIDEO &&
        this.getGeneralProvider() === 'bunny'
      ) {
        const resp = await fetch(url);
        if (!resp.ok) throw new BadRequestException('Source fetch failed');
        const buf = Buffer.from(await resp.arrayBuffer());
        const fakeFile: any = {
          buffer: buf,
          originalname: url.split('/').pop() || 'uploaded-file',
          mimetype: 'application/octet-stream',
          size: buf.length,
        };
        uploadResult = await this.bunnyProvider.uploadFileToStorage(fakeFile, {
          folder: this.getUploadFolder(fileType),
          fileName: fakeFile.originalname,
        });
      } else {
        uploadResult = await this.cloudinaryProvider.uploadFromUrl(url, {
          folder: this.getUploadFolder(fileType),
        });
      }

      const fileRecord = new this.fileModel({
        originalName: url.split('/').pop() || 'uploaded-file',
        fileName: uploadResult.public_id,
        mimeType: uploadResult.format
          ? `image/${uploadResult.format}`
          : 'application/octet-stream',
        size: uploadResult.bytes,
        type: uploadFileDto.type || FileType.IMAGE,
        status: FileStatus.COMPLETED,
        path: uploadResult.secure_url,
        url: uploadResult.secure_url,
        uploadedBy: new Types.ObjectId(userId),
        description: uploadFileDto.description,
        tags: uploadFileDto.tags || [],
        metadata: {
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
        },
        visibility: uploadFileDto.visibility || 'public',
        processedAt: new Date(),
        associatedEntity: uploadFileDto.associatedEntity,
        entityType: uploadFileDto.entityType,
      });

      return await fileRecord.save();
    } catch (error) {
      throw new BadRequestException(`URL upload failed: ${error.message}`);
    }
  }

  async getFileById(id: string): Promise<File> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('File not found');
    }

    const file = await this.fileModel
      .findById(id)
      .populate('uploadedBy', 'firstName lastName email')
      .exec();

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async getUserFiles(
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: FileType,
  ): Promise<{ files: File[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = { uploadedBy: new Types.ObjectId(userId) };

    if (type) {
      query.type = type;
    }

    const [files, total] = await Promise.all([
      this.fileModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.fileModel.countDocuments(query),
    ]);

    return { files, total };
  }

  async updateFile(
    id: string,
    updateData: Partial<File>,
    userId: string,
    userRole?: string,
  ): Promise<File> {
    const file = await this.getFileById(id);

    // Check if user owns the file or is an admin
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    if (file.uploadedBy.toString() !== userId && !isAdmin) {
      throw new BadRequestException('You can only update your own files');
    }

    const updatedFile = await this.fileModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updatedFile) {
      throw new NotFoundException('File not found');
    }

    return updatedFile;
  }

  async deleteFile(
    id: string,
    userId: string,
    userRole?: string,
  ): Promise<void> {
    const file = await this.getFileById(id);

    // Check if user owns the file or is an admin
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    if (file.uploadedBy.toString() !== userId && !isAdmin) {
      throw new BadRequestException('You can only delete your own files');
    }

    try {
      if (file.type === FileType.VIDEO && this.getVideoProvider() === 'bunny') {
        await this.bunnyProvider.deleteFile(file.fileName);
      } else if (
        file.type !== FileType.VIDEO &&
        this.getGeneralProvider() === 'bunny'
      ) {
        await this.bunnyProvider.deleteStorageFile(file.fileName);
      } else {
        await this.cloudinaryProvider.deleteFile(
          file.fileName,
          this.getResourceType(file.mimeType),
        );
      }

      // Delete from database
      await this.fileModel.findByIdAndDelete(id);
    } catch (error) {
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  async incrementDownloadCount(id: string): Promise<void> {
    await this.fileModel.findByIdAndUpdate(id, {
      $inc: { downloadCount: 1 },
    });
  }

  async getFilesByEntity(
    entityType: string,
    entityId: string,
  ): Promise<File[]> {
    return await this.fileModel
      .find({
        entityType,
        associatedEntity: entityId,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getStorageStats(userId?: string): Promise<any> {
    const matchStage: any = {};
    if (userId) {
      matchStage.uploadedBy = new Types.ObjectId(userId);
    }

    const stats = await this.fileModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
    ]);

    const totalStats = await this.fileModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
        },
      },
    ]);

    return {
      byType: stats,
      total: totalStats[0] || { totalFiles: 0, totalSize: 0 },
    };
  }

  // Helper methods
  private getAllowedMimeTypes(fileType: FileType): string[] {
    const typeMap = {
      [FileType.IMAGE]: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'image/bmp',
        'image/tiff',
        'image/avif',
        'image/heic',
        'image/heif',
      ],
      [FileType.VIDEO]: [
        'video/mp4',
        'video/mpeg',
        'video/ogg',
        'video/webm',
        'video/quicktime',
      ],
      [FileType.DOCUMENT]: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
      ],
      [FileType.AUDIO]: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/aac',
        'audio/flac',
      ],
      [FileType.OTHER]: [],
    };

    return typeMap[fileType] || [];
  }

  private detectFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) return FileType.IMAGE;
    if (mimeType.startsWith('video/')) return FileType.VIDEO;
    if (mimeType.startsWith('audio/')) return FileType.AUDIO;
    if (mimeType.startsWith('application/') || mimeType.startsWith('text/'))
      return FileType.DOCUMENT;
    return FileType.OTHER;
  }

  private getResourceType(
    mimeType: string,
  ): 'image' | 'video' | 'raw' | 'auto' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary treats audio as video
    return 'raw';
  }

  private getVideoProvider(): 'cloudinary' | 'bunny' {
    const v = this.configService.get<string>(
      'UPLOADS_VIDEO_PROVIDER',
      'cloudinary',
    );
    return v === 'bunny' ? 'bunny' : 'cloudinary';
  }

  private getGeneralProvider(): 'cloudinary' | 'bunny' {
    const v = this.configService.get<string>(
      'UPLOADS_GENERAL_PROVIDER',
      'cloudinary',
    );
    return v === 'bunny' ? 'bunny' : 'cloudinary';
  }

  private getUploadFolder(fileType: FileType): string {
    const folderMap = {
      [FileType.IMAGE]: 'personal-wings/images',
      [FileType.VIDEO]: 'personal-wings/videos',
      [FileType.DOCUMENT]: 'personal-wings/documents',
      [FileType.AUDIO]: 'personal-wings/audio',
      [FileType.OTHER]: 'personal-wings/other',
    };

    return folderMap[fileType] || 'personal-wings';
  }

  private extractMetadata(uploadResult: any, mimeType: string): any {
    const metadata: any = {};

    if (uploadResult.width) metadata.width = uploadResult.width;
    if (uploadResult.height) metadata.height = uploadResult.height;
    if (uploadResult.duration) metadata.duration = uploadResult.duration;
    if (uploadResult.pages) metadata.pages = uploadResult.pages;
    if (uploadResult.format) metadata.format = uploadResult.format;

    return metadata;
  }

  async bulkDeleteFiles(
    fileIds: string[],
    userId: string,
    userRole?: string,
  ): Promise<{ deleted: number; failed: number; errors: string[] }> {
    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const fileId of fileIds) {
      try {
        await this.deleteFile(fileId, userId, userRole);
        results.deleted++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${fileId}: ${error.message}`);
      }
    }

    return results;
  }

  async searchFiles(
    query: string,
    userId: string,
    type?: FileType,
    limit: number = 20,
  ): Promise<File[]> {
    const searchQuery: any = {
      uploadedBy: new Types.ObjectId(userId),
      $or: [
        { originalName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    };

    if (type) {
      searchQuery.type = type;
    }

    return this.fileModel
      .find(searchQuery)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async duplicateFile(fileId: string, userId: string): Promise<File> {
    const originalFile = await this.fileModel.findById(fileId).exec();
    if (!originalFile) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Check ownership or admin
    if (originalFile.uploadedBy.toString() !== userId) {
      throw new BadRequestException('You can only duplicate your own files');
    }

    // Create a new file record with the same URL but new metadata
    const duplicatedFile = new this.fileModel({
      originalName: `Copy of ${originalFile.originalName}`,
      fileName: originalFile.fileName,
      mimeType: originalFile.mimeType,
      size: originalFile.size,
      type: originalFile.type,
      status: originalFile.status,
      path: originalFile.path,
      url: originalFile.url,
      uploadedBy: new Types.ObjectId(userId),
      description: originalFile.description
        ? `Copy of ${originalFile.description}`
        : undefined,
      tags: [...(originalFile.tags || [])],
      metadata: originalFile.metadata,
      visibility: originalFile.visibility,
      processedAt: new Date(),
    });

    return await duplicatedFile.save();
  }

  async bulkUpdateVisibility(
    fileIds: string[],
    visibility: 'public' | 'private',
    userId: string,
    userRole: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const file = await this.fileModel.findById(fileId).exec();
        if (!file) {
          failed++;
          continue;
        }

        // Check ownership or admin
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        if (file.uploadedBy.toString() !== userId && !isAdmin) {
          failed++;
          continue;
        }

        file.visibility = visibility;
        await file.save();
        updated++;
      } catch (error) {
        failed++;
      }
    }

    return { updated, failed };
  }

  async bulkAddTags(
    fileIds: string[],
    tags: string[],
    userId: string,
    userRole: string,
  ): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const fileId of fileIds) {
      try {
        const file = await this.fileModel.findById(fileId).exec();
        if (!file) {
          failed++;
          continue;
        }

        // Check ownership or admin
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        if (file.uploadedBy.toString() !== userId && !isAdmin) {
          failed++;
          continue;
        }

        const existingTags = file.tags || [];
        const newTags = tags.filter((tag) => !existingTags.includes(tag));
        file.tags = [...existingTags, ...newTags];
        await file.save();
        updated++;
      } catch (error) {
        failed++;
      }
    }

    return { updated, failed };
  }

  async exportFiles(
    userId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<any> {
    const files = await this.fileModel
      .find({ uploadedBy: new Types.ObjectId(userId) })
      .exec();

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'ID',
        'Original Name',
        'File Name',
        'MIME Type',
        'Size (bytes)',
        'Type',
        'Status',
        'URL',
        'Description',
        'Tags',
        'Visibility',
        'Download Count',
        'Created At',
        'Updated At',
      ];

      const rows = files.map((file) => [
        (file._id as any).toString(),
        file.originalName,
        file.fileName,
        file.mimeType,
        file.size,
        file.type,
        file.status,
        file.url,
        file.description || '',
        (file.tags || []).join('; '),
        file.visibility,
        file.downloadCount || 0,
        (file as any).createdAt?.toISOString() || '',
        (file as any).updatedAt?.toISOString() || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
        ),
      ].join('\n');

      return csvContent;
    }

    // JSON format
    return {
      exportedAt: new Date().toISOString(),
      totalFiles: files.length,
      files: files.map((file) => ({
        _id: (file._id as any).toString(),
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        type: file.type,
        status: file.status,
        url: file.url,
        description: file.description,
        tags: file.tags || [],
        visibility: file.visibility,
        downloadCount: file.downloadCount || 0,
        createdAt: (file as any).createdAt?.toISOString(),
        updatedAt: (file as any).updatedAt?.toISOString(),
      })),
    };
  }

  // Folder Management Methods
  async getFolders(userId: string) {
    const folders = await this.fileModel.aggregate([
      {
        $match: {
          uploadedBy: new Types.ObjectId(userId),
          folder: { $exists: true, $nin: [null, ''] },
        },
      },
      {
        $group: {
          _id: '$folder',
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$size' },
          lastUpdated: { $max: '$updatedAt' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Add "Uncategorized" folder for files without a folder
    const uncategorizedCount = await this.fileModel.countDocuments({
      uploadedBy: new Types.ObjectId(userId),
      $or: [{ folder: { $exists: false } }, { folder: null }, { folder: '' }],
    });

    if (uncategorizedCount > 0) {
      const uncategorizedStats = await this.fileModel.aggregate([
        {
          $match: {
            uploadedBy: new Types.ObjectId(userId),
            $or: [
              { folder: { $exists: false } },
              { folder: null },
              { folder: '' },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$size' },
            lastUpdated: { $max: '$updatedAt' },
          },
        },
      ]);

      folders.unshift({
        _id: 'Uncategorized',
        fileCount: uncategorizedCount,
        totalSize: uncategorizedStats[0]?.totalSize || 0,
        lastUpdated: uncategorizedStats[0]?.lastUpdated || new Date(),
      });
    }

    return folders.map((folder) => ({
      name: folder._id,
      fileCount: folder.fileCount,
      totalSize: folder.totalSize,
      lastUpdated: folder.lastUpdated,
    }));
  }

  async getFilesByFolder(
    userId: string,
    folderName: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const query: any = { uploadedBy: new Types.ObjectId(userId) };

    if (folderName === 'Uncategorized') {
      query.$or = [
        { folder: { $exists: false } },
        { folder: null },
        { folder: '' },
      ];
    } else {
      query.folder = folderName;
    }

    const [files, total] = await Promise.all([
      this.fileModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.fileModel.countDocuments(query),
    ]);

    return {
      files,
      total,
      page,
      pages: Math.ceil(total / limit),
      folder: folderName,
    };
  }

  async bulkMoveToFolder(
    fileIds: string[],
    folder: string,
    userId: string,
    userRole: string,
  ) {
    const filter =
      userRole === 'super-admin' || userRole === 'admin'
        ? { _id: { $in: fileIds.map((id) => new Types.ObjectId(id)) } }
        : {
            _id: { $in: fileIds.map((id) => new Types.ObjectId(id)) },
            uploadedBy: new Types.ObjectId(userId),
          };

    const result = await this.fileModel.updateMany(filter, {
      $set: { folder },
    });

    return {
      success: true,
      updated: result.modifiedCount,
      message: `Moved ${result.modifiedCount} file(s) to ${folder}`,
    };
  }

  async deleteFolder(folderName: string, userId: string) {
    // Check if folder is empty
    const filesInFolder = await this.fileModel.countDocuments({
      uploadedBy: new Types.ObjectId(userId),
      folder: folderName,
    });

    if (filesInFolder > 0) {
      throw new BadRequestException(
        'Cannot delete folder with files. Move or delete files first.',
      );
    }

    return {
      success: true,
      message: 'Folder deleted successfully',
    };
  }
}
