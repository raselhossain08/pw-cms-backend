import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { File, FileType, FileStatus } from './entities/file.entity';
import { CloudinaryProvider } from './providers/cloudinary.provider';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(File.name) private fileModel: Model<File>,
    private configService: ConfigService,
    private cloudinaryProvider: CloudinaryProvider,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    uploadFileDto: UploadFileDto,
    userId: string,
  ): Promise<File> {
    // Validate file size
    const maxFileSize = this.configService.get<number>(
      'MAX_FILE_SIZE',
      5242880,
    );
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Validate file type
    const fileType = uploadFileDto.type || this.detectFileType(file.mimetype);
    const allowedTypes = this.getAllowedMimeTypes(fileType);
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed for ${fileType} uploads`,
      );
    }

    try {
      // Upload to Cloudinary
      const uploadResult = await this.cloudinaryProvider.uploadFile(file, {
        folder: this.getUploadFolder(fileType),
        resource_type: this.getResourceType(file.mimetype),
      });

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
      const uploadResult = await this.cloudinaryProvider.uploadFromUrl(url, {
        folder: this.getUploadFolder(fileType),
      });

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
    const query: any = { uploadedBy: userId };

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
  ): Promise<File> {
    const file = await this.getFileById(id);

    // Check if user owns the file
    if (file.uploadedBy.toString() !== userId) {
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

  async deleteFile(id: string, userId: string): Promise<void> {
    const file = await this.getFileById(id);

    // Check if user owns the file
    if (file.uploadedBy.toString() !== userId) {
      throw new BadRequestException('You can only delete your own files');
    }

    try {
      // Delete from Cloudinary
      await this.cloudinaryProvider.deleteFile(
        file.fileName,
        this.getResourceType(file.mimeType),
      );

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
}
