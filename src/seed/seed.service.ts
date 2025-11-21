// src/seed/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Header } from '../modules/header/entities/header.entity';
import { Footer } from '../modules/footer/entities/footer.entity';
import { defaultHeaderData } from './data/default-header.data';
import { defaultFooterData } from './footer.seed';

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectModel(Header.name)
        private readonly headerModel: Model<Header>,
        @InjectModel(Footer.name)
        private readonly footerModel: Model<Footer>,
    ) { }

    async seedHeaders(): Promise<void> {
        try {
            const existingHeaders = await this.headerModel.countDocuments();

            if (existingHeaders > 0) {
                this.logger.log(`Database already has ${existingHeaders} header(s). Skipping seed.`);
                return;
            }

            this.logger.log('Seeding default header data...');
            const header = new this.headerModel(defaultHeaderData);
            await header.save();

            this.logger.log('✅ Header data seeded successfully!');
        } catch (error) {
            this.logger.error('❌ Error seeding header data:', error);
            throw error;
        }
    }

    async seedFooters(): Promise<void> {
        try {
            const existingFooters = await this.footerModel.countDocuments();

            if (existingFooters > 0) {
                this.logger.log(`Database already has ${existingFooters} footer(s). Skipping seed.`);
                return;
            }

            this.logger.log('Seeding default footer data...');
            const footer = new this.footerModel(defaultFooterData);
            await footer.save();

            this.logger.log('✅ Footer data seeded successfully!');
        } catch (error) {
            this.logger.error('❌ Error seeding footer data:', error);
            throw error;
        }
    }

    async seedAll(): Promise<void> {
        this.logger.log('🌱 Starting database seeding...');
        await this.seedHeaders();
        await this.seedFooters();
        this.logger.log('🎉 Database seeding completed!');
    }
}
