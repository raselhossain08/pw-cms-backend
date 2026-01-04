/**
 * Script to store payment gateway configurations in the database
 * Run this script to initialize payment configs from environment variables
 * 
 * Usage: 
 *   ts-node scripts/store-payment-configs.ts
 *   or
 *   npm run script:store-payment-configs
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SystemConfigService } from '../src/system-config/system-config.service';

async function storePaymentConfigs() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(SystemConfigService);

  const paymentConfigs = [
    {
      key: 'STRIPE_PUBLISHABLE_KEY',
      value: process.env.STRIPE_PUBLISHABLE_KEY || '',
      category: 'payment' as const,
      label: 'Stripe Publishable Key',
      description: 'Your Stripe publishable key for client-side integration',
      isSecret: false,
      isRequired: false,
      placeholder: 'pk_test_...',
      metadata: { provider: 'Stripe', icon: 'stripe' },
    },
    {
      key: 'STRIPE_SECRET_KEY',
      value: process.env.STRIPE_SECRET_KEY || '',
      category: 'payment' as const,
      label: 'Stripe Secret Key',
      description: 'Your Stripe secret API key for processing payments',
      isSecret: true,
      isRequired: false,
      placeholder: 'sk_test_...',
      metadata: { provider: 'Stripe', icon: 'stripe' },
    },
    {
      key: 'STRIPE_WEBHOOK_SECRET',
      value: process.env.STRIPE_WEBHOOK_SECRET || '',
      category: 'payment' as const,
      label: 'Stripe Webhook Secret',
      description: 'Webhook signing secret for verifying Stripe events',
      isSecret: true,
      isRequired: false,
      placeholder: 'whsec_...',
      metadata: { provider: 'Stripe', icon: 'stripe' },
    },
    {
      key: 'PAYPAL_CLIENT_ID',
      value: process.env.PAYPAL_CLIENT_ID || '',
      category: 'payment' as const,
      label: 'PayPal Client ID',
      description: 'Your PayPal REST API client ID',
      isSecret: false,
      isRequired: false,
      placeholder: 'Your PayPal client ID',
      metadata: {
        provider: 'PayPal',
        icon: 'paypal',
        docs: 'https://developer.paypal.com',
      },
    },
    {
      key: 'PAYPAL_CLIENT_SECRET',
      value: process.env.PAYPAL_CLIENT_SECRET || '',
      category: 'payment' as const,
      label: 'PayPal Client Secret',
      description: 'Your PayPal REST API client secret',
      isSecret: true,
      isRequired: false,
      placeholder: 'Your PayPal client secret',
      metadata: { provider: 'PayPal', icon: 'paypal' },
    },
    {
      key: 'PAYPAL_MODE',
      value: process.env.PAYPAL_MODE || 'sandbox',
      category: 'payment' as const,
      label: 'PayPal Mode',
      description: 'PayPal environment mode (sandbox or live)',
      isSecret: false,
      isRequired: false,
      placeholder: 'sandbox',
      metadata: { provider: 'PayPal', options: ['sandbox', 'live'] },
    },
  ];

  console.log('Storing payment configurations in database...\n');

  for (const config of paymentConfigs) {
    try {
      if (!config.value) {
        console.warn(`⚠️  Skipping ${config.key} - no value provided`);
        continue;
      }

      await configService.create(config as any);
      console.log(`✅ Stored ${config.key}`);
    } catch (error: any) {
      if (error?.code === 11000 || error?.message?.includes('duplicate')) {
        // Update existing config
        await configService.update(config.key, { value: config.value } as any);
        console.log(`🔄 Updated ${config.key}`);
      } else {
        console.error(`❌ Failed to store ${config.key}:`, error.message);
      }
    }
  }

  console.log('\n✅ Payment configurations stored successfully!');
  console.log('\nNote: Restart the backend server for changes to take effect.');

  await app.close();
}

// Run the script
storePaymentConfigs().catch((error) => {
  console.error('Error storing payment configs:', error);
  process.exit(1);
});










