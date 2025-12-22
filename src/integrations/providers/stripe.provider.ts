import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IntegrationsService } from '../integrations.service';
import { PaymentProvider } from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider, OnModuleInit {
  public readonly name = 'Stripe';
  private stripe: Stripe | null = null;
  private readonly logger = new Logger(StripeProvider.name);
  private webhookSecret: string = '';
  private currentKey: string = '';

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) { }

  async onModuleInit() {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    await this.getClient();
  }

  private async getClient(): Promise<Stripe> {
    try {
      let integration;
      try {
        integration = await this.integrationsService.findBySlug('stripe');
      } catch (e) {
        // Ignore if not found
      }

      const secretKey = integration?.credentials?.secretKey || this.configService.get('STRIPE_SECRET_KEY');
      this.webhookSecret = integration?.credentials?.webhookSecret || this.configService.get('STRIPE_WEBHOOK_SECRET');

      if (!secretKey) {
        throw new BadRequestException('Stripe Secret Key is missing');
      }

      if (this.stripe && this.currentKey === secretKey) {
        return this.stripe;
      }

      this.currentKey = secretKey;
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-10-29.clover',
      });
      this.logger.log('Stripe provider initialized/updated');
      return this.stripe;
    } catch (error) {
      this.logger.error('Failed to initialize Stripe provider', error);
      throw new BadRequestException('Stripe provider initialization failed');
    }
  }

  private async checkInitialized() {
    return await this.getClient();
  }

  async createPaymentIntent(amount: number, currency: string, metadata: any = {}) {
    const stripe = await this.checkInitialized();
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: { enabled: true },
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      };
    } catch (error: any) {
      this.logger.error(`Create PaymentIntent failed: ${error.message}`);
      throw new BadRequestException(`Stripe error: ${error.message}`);
    }
  }

  async confirmPayment(paymentId: string) {
    const stripe = await this.checkInitialized();
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      if (paymentIntent.status === 'succeeded') {
        return { success: true, paymentIntent };
      }
      // Attempt confirm if needed, though usually handled client-side
      const confirmed = await stripe.paymentIntents.confirm(paymentId);
      return { success: true, paymentIntent: confirmed };
    } catch (error: any) {
      throw new BadRequestException(`Confirm payment failed: ${error.message}`);
    }
  }

  async createRefund(paymentId: string, amount?: number) {
    const stripe = await this.checkInitialized();
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: paymentId,
      };
      if (amount) {
        params.amount = Math.round(amount * 100);
      }
      const refund = await stripe.refunds.create(params);
      return refund;
    } catch (error: any) {
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  async createSubscription(customerId: string, priceId: string) {
    const stripe = await this.checkInitialized();
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error: any) {
      throw new BadRequestException(`Create subscription failed: ${error.message}`);
    }
  }

  async cancelSubscription(subscriptionId: string) {
    const stripe = await this.checkInitialized();
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error: any) {
      throw new BadRequestException(`Cancel subscription failed: ${error.message}`);
    }
  }

  async createCheckoutSession(data: {
    lineItems: any[];
    successUrl: string;
    cancelUrl: string;
    metadata?: any;
  }) {
    const stripe = await this.checkInitialized();
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: data.lineItems,
        mode: 'payment',
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        metadata: data.metadata,
        billing_address_collection: 'required',
      });
      return { id: session.id, url: session.url };
    } catch (error: any) {
      throw new BadRequestException(`Checkout session failed: ${error.message}`);
    }
  }

  async retrieveCheckoutSession(sessionId: string) {
    const stripe = await this.checkInitialized();
    try {
      return await stripe.checkout.sessions.retrieve(sessionId);
    } catch (error: any) {
      throw new BadRequestException(`Session retrieval failed: ${error.message}`);
    }
  }

  async createCustomer(email: string, name: string) {
    const stripe = await this.checkInitialized();
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error: any) {
      throw new BadRequestException(`Create customer failed: ${error.message}`);
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    const stripe = await this.checkInitialized();
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return true;
    } catch (error: any) {
      throw new BadRequestException(`Attach payment method failed: ${error.message}`);
    }
  }

  async detachPaymentMethod(paymentMethodId: string) {
    const stripe = await this.checkInitialized();
    try {
      await stripe.paymentMethods.detach(paymentMethodId);
      return true;
    } catch (error: any) {
      throw new BadRequestException(`Detach payment method failed: ${error.message}`);
    }
  }

  async retrievePaymentMethod(paymentMethodId: string) {
    const stripe = await this.checkInitialized();
    try {
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      throw new BadRequestException(`Retrieve payment method failed: ${error.message}`);
    }
  }

  async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
    const stripe = await this.checkInitialized();
    if (!this.webhookSecret) {
      throw new BadRequestException('Stripe Webhook Secret not configured');
    }
    try {
      stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch (error) {
      return false;
    }
  }

  async constructEvent(payload: any, signature: string): Promise<Stripe.Event> {
    const stripe = await this.checkInitialized();
    if (!this.webhookSecret) {
      throw new BadRequestException('Stripe Webhook Secret not configured');
    }
    try {
      return stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${error.message}`);
    }
  }

  async handleWebhook(event: any) {
    // This method can be used for generic handling if needed
    return { handled: true };
  }
}
