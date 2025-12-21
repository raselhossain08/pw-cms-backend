import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AboutSection } from '../schemas/about-section.schema';
import {
  CreateAboutSectionDto,
  UpdateAboutSectionDto,
} from '../dto/about-section.dto';

@Injectable()
export class AboutSectionService {
  constructor(
    @InjectModel(AboutSection.name)
    private aboutSectionModel: Model<AboutSection>,
  ) { }

  /**
   * Get the About Section (single document with id 'about')
   */
  async getAboutSection(): Promise<AboutSection | null> {
    return this.aboutSectionModel.findOne({ id: 'about' }).exec();
  }

  /**
   * Create or update the About Section (upsert operation)
   */
  async upsertAboutSection(dto: CreateAboutSectionDto): Promise<AboutSection> {
    const id = dto.id || 'about';

    const updated = await this.aboutSectionModel
      .findOneAndUpdate({ id }, { ...dto, id }, { new: true, upsert: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('About Section upsert failed');
    }

    return updated;
  }

  /**
   * Update the About Section
   */
  async updateAboutSection(dto: UpdateAboutSectionDto): Promise<AboutSection> {
    const id = dto.id || 'about';

    const existing = await this.aboutSectionModel.findOne({ id }).exec();

    if (!existing) {
      throw new NotFoundException('About Section not found');
    }

    const updated = await this.aboutSectionModel
      .findOneAndUpdate({ id }, { $set: dto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('About Section not found');
    }

    return updated;
  }

  /**
   * Toggle isActive status
   */
  async toggleActive(): Promise<AboutSection> {
    const existing = await this.aboutSectionModel
      .findOne({ id: 'about' })
      .exec();

    if (!existing) {
      throw new NotFoundException('About Section not found');
    }

    const updated = await this.aboutSectionModel
      .findOneAndUpdate(
        { id: 'about' },
        { $set: { isActive: !existing.isActive } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('About Section not found');
    }

    return updated;
  }

  /**
   * Delete the About Section (rarely used, but included for completeness)
   */
  async deleteAboutSection(): Promise<void> {
    await this.aboutSectionModel.deleteOne({ id: 'about' }).exec();
  }

  /**
   * Duplicate the About Section
   */
  async duplicate(): Promise<AboutSection> {
    const existing = await this.aboutSectionModel.findOne({ id: 'about' }).exec();

    if (!existing) {
      throw new NotFoundException('About Section not found');
    }

    // Create a duplicate with a new ID
    const duplicated = new this.aboutSectionModel({
      ...existing.toObject(),
      id: `about-${Date.now()}`,
      isActive: false, // Duplicated items are inactive by default
      _id: undefined, // Remove the original _id
    });

    return duplicated.save();
  }

  /**
   * Export the About Section
   */
  async export(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const aboutSection = await this.aboutSectionModel.findOne({ id: 'about' }).exec();

    if (!aboutSection) {
      throw new NotFoundException('About Section not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(aboutSection, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      aboutSection,
    };
  }
}
