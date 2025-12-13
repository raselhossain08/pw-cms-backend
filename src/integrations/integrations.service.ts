import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationStatus } from './integrations.entity';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { IntegrationConfigDto } from './dto/integration-config.dto';

@Injectable()
export class IntegrationsService {
    constructor(
        @InjectModel(Integration.name)
        private readonly integrationModel: Model<Integration>,
    ) { }

    async create(createDto: CreateIntegrationDto): Promise<Integration> {
        const integration = new this.integrationModel(createDto);
        return await integration.save();
    }

    async findAll(query?: {
        search?: string;
        category?: string;
        status?: IntegrationStatus;
    }): Promise<Integration[]> {
        const filter: any = { isActive: true };

        if (query?.status) {
            filter.status = query.status;
        }

        if (query?.category) {
            filter.category = query.category;
        }

        if (query?.search) {
            const searchRegex = new RegExp(query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
            ];
        }

        return await this.integrationModel
            .find(filter)
            .sort({ sortOrder: 1, createdAt: -1 })
            .exec();
    }

    async findOne(id: string): Promise<Integration> {
        const integration = await this.integrationModel.findById(id).exec();
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }
        return integration;
    }

    async findBySlug(slug: string): Promise<Integration> {
        const integration = await this.integrationModel.findOne({ slug }).exec();
        if (!integration) {
            throw new NotFoundException(`Integration with slug ${slug} not found`);
        }
        return integration;
    }

    async update(
        id: string,
        updateDto: UpdateIntegrationDto,
    ): Promise<Integration> {
        const integration = await this.integrationModel
            .findByIdAndUpdate(id, updateDto, { new: true })
            .exec();
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }
        return integration;
    }

    async updateConfig(
        id: string,
        configDto: IntegrationConfigDto,
    ): Promise<Integration> {
        const integration = await this.findOne(id);

        const updateData: any = {};

        if (configDto.config) {
            updateData.config = { ...integration.config, ...configDto.config };
        }

        if (configDto.credentials) {
            updateData.credentials = {
                ...integration.credentials,
                ...configDto.credentials,
            };
        }

        if (configDto.status) {
            updateData.status = configDto.status;
        }

        const updated = await this.integrationModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .exec();
        if (!updated) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }
        return updated;
    }

    async connect(id: string): Promise<Integration> {
        const integration = await this.integrationModel
            .findByIdAndUpdate(
                id,
                { status: IntegrationStatus.CONNECTED },
                { new: true },
            )
            .exec();
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }
        return integration;
    }

    async disconnect(id: string): Promise<Integration> {
        const integration = await this.integrationModel
            .findByIdAndUpdate(
                id,
                { status: IntegrationStatus.DISCONNECTED },
                { new: true },
            )
            .exec();
        if (!integration) {
            throw new NotFoundException(`Integration with ID ${id} not found`);
        }
        return integration;
    }

    async testConnection(id: string): Promise<{ success: boolean; message: string }> {
        const integration = await this.findOne(id);

        // Basic validation
        if (!integration.config || Object.keys(integration.config).length === 0) {
            return { success: false, message: 'Integration not configured' };
        }

        // Here you would implement actual connection testing logic
        // For now, return success if configuration exists
        return { success: true, message: 'Connection test successful' };
    }

    async remove(id: string): Promise<void> {
        await this.integrationModel.findByIdAndUpdate(id, { isActive: false }).exec();
    }

    async getStats(): Promise<{
        total: number;
        connected: number;
        disconnected: number;
        pending: number;
    }> {
        const all = await this.integrationModel.find({ isActive: true }).exec();

        return {
            total: all.length,
            connected: all.filter((i) => i.status === IntegrationStatus.CONNECTED)
                .length,
            disconnected: all.filter(
                (i) => i.status === IntegrationStatus.DISCONNECTED,
            ).length,
            pending: all.filter((i) => i.status === IntegrationStatus.PENDING).length,
        };
    }

    async seed(): Promise<void> {
        const existing = await this.integrationModel.countDocuments().exec();
        if (existing > 0) return;

        const seedData: CreateIntegrationDto[] = [
            {
                name: 'Stripe',
                slug: 'stripe',
                category: 'Payment Gateways' as any,
                description: 'Secure payment processing for your courses and subscriptions',
                status: IntegrationStatus.CONNECTED,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Stripe_Logo%2C_revised_2016.svg/512px-Stripe_Logo%2C_revised_2016.svg.png',
                stats: [
                    { label: 'Transactions', value: '1,240' },
                    { label: 'Revenue', value: '$84,329' },
                    { label: 'Region', value: 'India' },
                ],
                sortOrder: 1,
            },
            {
                name: 'PayPal',
                slug: 'paypal',
                category: 'Payment Gateways' as any,
                description: 'Global payments and payouts',
                status: IntegrationStatus.DISCONNECTED,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/PayPal.svg/512px-PayPal.svg.png',
                stats: [
                    { label: 'Transactions', value: '—' },
                    { label: 'Status', value: 'Not configured' },
                ],
                sortOrder: 2,
            },
            {
                name: 'Email SMTP',
                slug: 'smtp',
                category: 'Communication' as any,
                description: 'Transactional emails and notifications',
                status: IntegrationStatus.CONNECTED,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/512px-Gmail_icon_%282020%29.svg.png',
                stats: [
                    { label: 'Daily Limit', value: '10,000' },
                    { label: 'Status', value: 'Active' },
                ],
                sortOrder: 3,
            },
            {
                name: 'Twilio',
                slug: 'twilio',
                category: 'Communication' as any,
                description: 'SMS and voice notifications',
                status: IntegrationStatus.PENDING,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Twilio_logo_red.svg/512px-Twilio_logo_red.svg.png',
                stats: [
                    { label: 'Status', value: 'API keys needed' },
                    { label: 'Features', value: 'SMS, Voice' },
                ],
                sortOrder: 4,
            },
            {
                name: 'Facebook Ads',
                slug: 'facebook-ads',
                category: 'Marketing' as any,
                description: 'Campaign tracking and conversion',
                status: IntegrationStatus.DISCONNECTED,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Facebook_Logo_2023.png/512px-Facebook_Logo_2023.png',
                sortOrder: 5,
            },
            {
                name: 'Google Analytics',
                slug: 'google-analytics',
                category: 'Analytics' as any,
                description: 'Website analytics and performance',
                status: IntegrationStatus.CONNECTED,
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Google_Analytics_logo.png/512px-Google_Analytics_logo.png',
                sortOrder: 6,
            },
        ];

        for (const data of seedData) {
            await this.create(data);
        }
    }
}
