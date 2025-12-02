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
  ) {}

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
}
