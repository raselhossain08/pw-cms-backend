import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { Integration, IntegrationSchema } from './integrations.entity';
import { StripeProvider } from './providers/stripe.provider';
import { PayPalProvider } from './providers/paypal.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Integration.name, schema: IntegrationSchema },
    ]),
    ConfigModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, StripeProvider, PayPalProvider],
  exports: [IntegrationsService, StripeProvider, PayPalProvider],
})
export class IntegrationsModule {}
