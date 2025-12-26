import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from '../../system-config/system-config.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeService.name);
  private enabled: boolean = false;

  constructor(
    private configService: ConfigService,
    private systemConfigService: SystemConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeStripe();
  }

  private async initializeStripe() {
    const secretKey =
      (await this.systemConfigService.getValue('STRIPE_SECRET_KEY')) ||
      this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not configured. Stripe payments will be disabled.',
      );
      this.enabled = false;
      return;
    }

    this.enabled = true;
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-10-29.clover',
    });
    this.logger.log('Stripe service initialized successfully');
  }

  /**
   * Refresh Stripe configuration from database
   */
  async refreshConfig() {
    await this.initializeStripe();
  }

  private checkEnabled() {
    if (!this.enabled || !this.stripe) {
      throw new BadRequestException(
        'Stripe payment service is not configured. Please contact support.',
      );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: any = {},
  ) {
    this.checkEnabled();

    try {
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
      };
    } catch (error) {
      throw new BadRequestException(`Stripe error: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    this.checkEnabled();

    try {
      const paymentIntent =
        await this.stripe!.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntent,
          charge: paymentIntent.latest_charge,
        };
      }

      // If not succeeded, confirm the payment
      const confirmedIntent =
        await this.stripe!.paymentIntents.confirm(paymentIntentId);

      return {
        success: confirmedIntent.status === 'succeeded',
        paymentIntent: confirmedIntent,
        charge: confirmedIntent.latest_charge,
      };
    } catch (error) {
      throw new BadRequestException(
        `Payment confirmation failed: ${error.message}`,
      );
    }
  }

  async createCustomer(email: string, name: string, paymentMethodId?: string) {
    this.checkEnabled();

    try {
      const customerData: any = {
        email,
        name,
      };

      if (paymentMethodId) {
        customerData.payment_method = paymentMethodId;
        customerData.invoice_settings = {
          default_payment_method: paymentMethodId,
        };
      }

      const customer = await this.stripe!.customers.create(customerData);

      if (paymentMethodId) {
        await this.stripe!.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });
      }

      return customer;
    } catch (error) {
      throw new BadRequestException(
        `Customer creation failed: ${error.message}`,
      );
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata: any = {},
  ) {
    this.checkEnabled();

    try {
      const subscription = await this.stripe!.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      throw new BadRequestException(
        `Subscription creation failed: ${error.message}`,
      );
    }
  }

  async createInvoice(customerId: string, amount: number, description: string) {
    this.checkEnabled();

    try {
      // Create invoice item first (Stripe API v2025 requires this)
      await this.stripe!.invoiceItems.create({
        customer: customerId,
        amount: Math.round(amount * 100),
        currency: 'usd',
        description,
      });

      // Then create the invoice
      const invoice = await this.stripe!.invoices.create({
        customer: customerId,
        description,
      });

      return invoice;
    } catch (error) {
      throw new BadRequestException(
        `Invoice creation failed: ${error.message}`,
      );
    }
  }

  async handleWebhook(
    payload: any,
    signature: string,
  ): Promise<{ event: any; type: string }> {
    this.checkEnabled();

    try {
      const webhookSecret =
        (await this.systemConfigService.getValue('STRIPE_WEBHOOK_SECRET')) ||
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        throw new BadRequestException(
          'STRIPE_WEBHOOK_SECRET is not configured',
        );
      }
      const event = this.stripe!.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      return { event, type: event.type };
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  async refundPayment(paymentIntentId: string, amount?: number) {
    this.checkEnabled();

    try {
      const refundData: any = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe!.refunds.create(refundData);
      return refund;
    } catch (error) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async createCheckoutSession(data: {
    lineItems: any[];
    successUrl: string;
    cancelUrl: string;
    metadata?: any;
  }) {
    this.checkEnabled();

    try {
      const session = await this.stripe!.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: data.lineItems,
        mode: 'payment',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        metadata: data.metadata,
        billing_address_collection: 'required',
      });

      return {
        id: session.id,
        url: session.url,
      };
    } catch (error) {
      throw new BadRequestException(
        `Checkout session creation failed: ${error.message}`,
      );
    }
  }

  async retrieveCheckoutSession(sessionId: string) {
    this.checkEnabled();

    try {
      const session = await this.stripe!.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      throw new BadRequestException(
        `Session retrieval failed: ${error.message}`,
      );
    }
  }
}
