import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

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
    const testResult = await this.testConnection(id);

    if (!testResult.success) {
      throw new BadRequestException(
        `Cannot connect integration: ${testResult.message}`,
      );
    }

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

  async testConnection(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const integration = await this.findOne(id);

    const requiresConfig =
      integration.slug === 'stripe' ||
      integration.slug === 'paypal' ||
      integration.slug === 'smtp' ||
      integration.slug === 'twilio';

    if (!requiresConfig) {
      return { success: true, message: 'Connection test successful' };
    }

    const hasCredentials =
      integration.credentials &&
      Object.keys(integration.credentials).length > 0;
    const hasConfig =
      integration.config && Object.keys(integration.config).length > 0;

    if (!hasCredentials && !hasConfig) {
      return { success: false, message: 'Integration not configured' };
    }

    if (integration.slug === 'stripe') {
      const hasKey =
        integration.credentials?.secretKey || process.env.STRIPE_SECRET_KEY;
      if (!hasKey) {
        return { success: false, message: 'Stripe Secret Key is missing' };
      }
    }

    if (integration.slug === 'paypal') {
      const hasClientId =
        integration.credentials?.clientId || process.env.PAYPAL_CLIENT_ID;
      const hasClientSecret =
        integration.credentials?.clientSecret ||
        process.env.PAYPAL_CLIENT_SECRET;

      if (!hasClientId || !hasClientSecret) {
        return { success: false, message: 'PayPal credentials are incomplete' };
      }
    }

    if (integration.slug === 'smtp') {
      const hasHost = integration.config?.host;
      const hasPort = integration.config?.port;
      if (!hasHost || !hasPort) {
        return {
          success: false,
          message: 'SMTP configuration is incomplete',
        };
      }
    }

    if (integration.slug === 'twilio') {
      const hasAccountSid = integration.credentials?.accountSid;
      const hasAuthToken = integration.credentials?.authToken;
      if (!hasAccountSid || !hasAuthToken) {
        return {
          success: false,
          message: 'Twilio credentials are incomplete',
        };
      }
    }

    return { success: true, message: 'Connection test successful' };
  }

  async remove(id: string): Promise<void> {
    await this.integrationModel
      .findByIdAndUpdate(id, { isActive: false })
      .exec();
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
        description:
          'Secure payment processing for your courses and subscriptions',
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

  async delete(id: string): Promise<void> {
    const result = await this.integrationModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }
  }

  async toggleStatus(id: string, status: boolean): Promise<Integration> {
    const integration = await this.integrationModel
      .findByIdAndUpdate(
        id,
        {
          status: status
            ? IntegrationStatus.CONNECTED
            : IntegrationStatus.DISCONNECTED,
        },
        { new: true },
      )
      .exec();

    if (!integration) {
      throw new NotFoundException(`Integration with ID ${id} not found`);
    }
    return integration;
  }

  async updateSystemWebhooks(config: {
    url: string;
    events: string[];
  }): Promise<any> {
    const slug = 'system-webhooks';
    let integration = await this.integrationModel.findOne({ slug }).exec();

    if (!integration) {
      integration = new this.integrationModel({
        name: 'System Webhooks',
        slug,
        category: 'Developer Tools',
        description: 'Global system webhook configuration',
        status: IntegrationStatus.CONNECTED,
        logo: '',
        isActive: false,
      });
    }

    const url = (config.url || '').trim();
    if (!url) {
      throw new BadRequestException('Webhook URL is required');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new BadRequestException('Webhook URL is invalid');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new BadRequestException(
        'Webhook URL must use http or https protocol',
      );
    }

    const events = Array.isArray(config.events)
      ? Array.from(
          new Set(
            config.events
              .map((e) => (e || '').trim())
              .filter((e) => e.length > 0),
          ),
        )
      : [];

    integration.config = {
      ...(integration.config || {}),
      webhookUrl: url,
      events,
    };

    await integration.save();
    return { message: 'Webhook configuration saved', config: { url, events } };
  }

  async getSystemWebhooks(): Promise<any> {
    const slug = 'system-webhooks';
    const integration = await this.integrationModel.findOne({ slug }).exec();
    if (!integration || !integration.config) {
      return { url: '', events: [] };
    }
    return {
      url: integration.config.webhookUrl || '',
      events: integration.config.events || [],
    };
  }
}
