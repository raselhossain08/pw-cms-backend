import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IntegrationsService } from '../src/integrations/integrations.service';
import { IntegrationCategory, IntegrationStatus } from '../src/integrations/integrations.entity';

async function seedIntegrations() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const integrationsService = app.get(IntegrationsService);

  const integrations = [
    {
      name: 'Stripe',
      slug: 'stripe',
      category: IntegrationCategory.PAYMENT_GATEWAYS,
      description: 'Accept payments, subscriptions, and payouts globally.',
      status: IntegrationStatus.CONNECTED,
      isActive: true,
      credentials: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      },
      config: {
        mode: 'test',
      },
      logo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
    },
    {
      name: 'PayPal',
      slug: 'paypal',
      category: IntegrationCategory.PAYMENT_GATEWAYS,
      description: 'The safer, easier way to pay and get paid online.',
      status: IntegrationStatus.CONNECTED,
      isActive: true,
      credentials: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        mode: process.env.PAYPAL_MODE || 'sandbox',
      },
      config: {
        mode: process.env.PAYPAL_MODE || 'sandbox',
      },
      logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
    },
  ];

  console.log('Seeding integrations...');

  for (const integrationData of integrations) {
    try {
      const existing = await integrationsService.findBySlug(integrationData.slug);
      if (existing) {
        console.log(`Updating ${integrationData.name}...`);
        await integrationsService.update(existing.id, integrationData);
      } else {
        console.log(`Creating ${integrationData.name}...`);
        await integrationsService.create(integrationData as any);
      }
    } catch (e) {
      if (e.name === 'NotFoundException') {
        console.log(`Creating ${integrationData.name}...`);
        await integrationsService.create(integrationData as any);
      } else {
        console.error(`Error seeding ${integrationData.name}:`, e.message);
      }
    }
  }

  console.log('Done.');
  await app.close();
}

seedIntegrations();
