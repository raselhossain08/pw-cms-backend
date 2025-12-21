import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { HomeSEO } from '../schemas/home-seo.schema';
import { CreateHomeSEODto, UpdateHomeSEODto } from '../dto/home-seo.dto';

type HomeSEODocument = HomeSEO & Document;

@Injectable()
export class HomeSEOService {
    constructor(
        @InjectModel(HomeSEO.name) private homeSEOModel: Model<HomeSEO>,
    ) { }

    async getSEO(): Promise<HomeSEODocument> {
        // Get the active SEO configuration (there should only be one)
        const seo = await this.homeSEOModel.findOne({ isActive: true });

        // If no SEO exists, create default one
        if (!seo) {
            return this.createDefaultSEO();
        }

        return seo as HomeSEODocument;
    }

    async updateSEO(updateDto: UpdateHomeSEODto): Promise<HomeSEODocument> {
        const seo = await this.homeSEOModel.findOne({ isActive: true });

        if (!seo) {
            // Create if doesn't exist with the update data
            return this.createSEO({ ...updateDto } as CreateHomeSEODto);
        }

        // Update the SEO
        Object.assign(seo, updateDto);
        return seo.save() as Promise<HomeSEODocument>;
    }

    async resetToDefaults(): Promise<HomeSEODocument> {
        // Delete existing SEO
        await this.homeSEOModel.deleteMany({});

        // Create new default SEO
        return this.createDefaultSEO();
    }

    private async createDefaultSEO(): Promise<HomeSEODocument> {
        const defaultSEO = new this.homeSEOModel({
            title: 'Home - Your Learning Platform',
            description: 'Welcome to our learning platform. Discover courses, enhance your skills, and achieve your goals.',
            keywords: ['learning', 'courses', 'education', 'training', 'online learning'],
            ogTitle: 'Home - Your Learning Platform',
            ogDescription: 'Welcome to our learning platform. Discover courses, enhance your skills, and achieve your goals.',
            twitterCard: 'summary_large_image',
            robots: 'index, follow',
            locale: 'en_US',
            siteName: 'Your Learning Platform',
            isActive: true,
        });

        return defaultSEO.save() as Promise<HomeSEODocument>;
    }

    async createSEO(createDto: CreateHomeSEODto): Promise<HomeSEODocument> {
        // Deactivate any existing SEO
        await this.homeSEOModel.updateMany({}, { isActive: false });

        const seo = new this.homeSEOModel({
            ...createDto,
            isActive: true,
        });

        return seo.save() as Promise<HomeSEODocument>;
    }

    async deleteSEO(): Promise<void> {
        await this.homeSEOModel.deleteMany({});
    }
}
