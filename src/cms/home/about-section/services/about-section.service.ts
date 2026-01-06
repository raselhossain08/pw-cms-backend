import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AboutSection } from '../schemas/about-section.schema';
import {
  CreateAboutSectionDto,
  UpdateAboutSectionDto,
} from '../dto/about-section.dto';

@Injectable()
export class AboutSectionService {
  private readonly logger = new Logger(AboutSectionService.name);
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectModel(AboutSection.name)
    private aboutSectionModel: Model<AboutSection>,
  ) {}

  /**
   * Cache helper methods
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    this.logger.debug(`Cache set for key: ${key}`);
  }

  private clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.logger.debug(`Cache cleared for key: ${key}`);
    } else {
      this.cache.clear();
      this.logger.debug('All cache cleared');
    }
  }

  /**
   * Get the About Section (single document with id 'about')
   * Implements caching for improved performance
   */
  async getAboutSection(): Promise<AboutSection | null> {
    try {
      // Check cache first
      const cacheKey = 'about-section:about';
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      this.logger.log('Fetching about section from database');
      const aboutSection = await this.aboutSectionModel
        .findOne({ id: 'about' })
        .lean()
        .exec();

      if (aboutSection) {
        this.setCache(cacheKey, aboutSection);
      }

      return aboutSection as any;
    } catch (error) {
      this.logger.error(
        `Failed to fetch about section: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve about section from database',
      );
    }
  }

  /**
   * Create or update the About Section (upsert operation)
   * Clears cache after successful operation
   */
  async upsertAboutSection(dto: CreateAboutSectionDto): Promise<AboutSection> {
    try {
      const id = dto.id || 'about';

      // Validate DTO
      if (!dto.title || !dto.subtitle || !dto.description) {
        throw new BadRequestException(
          'Title, subtitle, and description are required',
        );
      }

      this.logger.log(`Upserting about section with id: ${id}`);
      const updated = await this.aboutSectionModel
        .findOneAndUpdate(
          { id },
          { ...dto, id },
          { new: true, upsert: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new InternalServerErrorException('About Section upsert failed');
      }

      // Clear cache after successful update
      this.clearCache(`about-section:${id}`);
      this.logger.log(`About section upserted successfully: ${id}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to upsert about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to upsert about section',
        error.message,
      );
    }
  }

  /**
   * Update the About Section
   * Validates existence before update and clears cache
   */
  async updateAboutSection(dto: UpdateAboutSectionDto): Promise<AboutSection> {
    try {
      const id = dto.id || 'about';

      this.logger.log(`Updating about section with id: ${id}`);
      const existing = await this.aboutSectionModel.findOne({ id }).exec();

      if (!existing) {
        throw new NotFoundException(`About Section with id "${id}" not found`);
      }

      const updated = await this.aboutSectionModel
        .findOneAndUpdate(
          { id },
          { $set: dto },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('About Section not found after update');
      }

      // Clear cache after successful update
      this.clearCache(`about-section:${id}`);
      this.logger.log(`About section updated successfully: ${id}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to update about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to update about section',
        error.message,
      );
    }
  }

  /**
   * Toggle isActive status
   * Clears cache after toggling
   */
  async toggleActive(): Promise<AboutSection> {
    try {
      this.logger.log('Toggling about section active status');
      const existing = await this.aboutSectionModel
        .findOne({ id: 'about' })
        .exec();

      if (!existing) {
        throw new NotFoundException(
          'About Section not found. Please create one first.',
        );
      }

      const newStatus = !existing.isActive;
      const updated = await this.aboutSectionModel
        .findOneAndUpdate(
          { id: 'about' },
          { $set: { isActive: newStatus } },
          { new: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException('About Section not found during update');
      }

      // Clear cache after toggle
      this.clearCache('about-section:about');
      this.logger.log(`About section status toggled to: ${newStatus}`);

      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to toggle about section status: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to toggle about section status',
        error.message,
      );
    }
  }

  /**
   * Delete the About Section (rarely used, but included for completeness)
   * Clears cache after deletion
   */
  async deleteAboutSection(): Promise<void> {
    try {
      this.logger.log('Deleting about section');
      const result = await this.aboutSectionModel
        .deleteOne({ id: 'about' })
        .exec();

      if (result.deletedCount === 0) {
        throw new NotFoundException('About Section not found');
      }

      // Clear cache after deletion
      this.clearCache('about-section:about');
      this.logger.log('About section deleted successfully');
    } catch (error) {
      this.logger.error(
        `Failed to delete about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to delete about section',
        error.message,
      );
    }
  }

  /**
   * Duplicate the About Section
   * Creates a copy with a new unique ID
   */
  async duplicate(): Promise<AboutSection> {
    try {
      this.logger.log('Duplicating about section');
      const existing = await this.aboutSectionModel
        .findOne({ id: 'about' })
        .exec();

      if (!existing) {
        throw new NotFoundException(
          'About Section not found. Cannot duplicate non-existent section.',
        );
      }

      const newId = `about-${Date.now()}`;
      const existingObj = existing.toObject();

      // Create a duplicate with a new ID
      const duplicated = new this.aboutSectionModel({
        ...existingObj,
        id: newId,
        title: `${existingObj.title} (Copy)`,
        isActive: false, // Duplicated items are inactive by default
        _id: undefined, // Remove the original _id
        createdAt: undefined,
        updatedAt: undefined,
      });

      const saved = await duplicated.save();
      this.logger.log(`About section duplicated with new ID: ${newId}`);

      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to duplicate about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to duplicate about section',
        error.message,
      );
    }
  }

  /**
   * Export the About Section
   * Supports JSON and PDF formats
   */
  async export(format: 'json' | 'pdf' = 'json'): Promise<any> {
    try {
      this.logger.log(`Exporting about section in ${format} format`);
      const aboutSection = await this.aboutSectionModel
        .findOne({ id: 'about' })
        .lean()
        .exec();

      if (!aboutSection) {
        throw new NotFoundException(
          'About Section not found. Cannot export non-existent section.',
        );
      }

      if (format === 'pdf') {
        // For PDF, return formatted text that can be converted to PDF
        // In production, use libraries like pdfkit, puppeteer, or pdf-lib
        this.logger.warn(
          'PDF export is not fully implemented. Returning JSON string.',
        );
        return JSON.stringify(aboutSection, null, 2);
      }

      const exportData = {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0.0',
        aboutSection: {
          ...aboutSection,
          _id: undefined, // Remove MongoDB internal ID for cleaner export
        },
        meta: {
          exportedBy: 'CMS About Section Module',
          description: 'Homepage About Section Export',
        },
      };

      this.logger.log('About section exported successfully');
      return exportData;
    } catch (error) {
      this.logger.error(
        `Failed to export about section: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to export about section',
        error.message,
      );
    }
  }
}
