import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/checkout-server-sdk';
import { IntegrationsService } from '../integrations.service';
import { PaymentProvider } from '../interfaces/payment-provider.interface';

@Injectable()
export class PayPalProvider implements PaymentProvider, OnModuleInit {
  public readonly name = 'PayPal';
  private client: paypal.core.PayPalHttpClient | null = null;
  private readonly logger = new Logger(PayPalProvider.name);
  private currentKey: string = '';

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    await this.getClient();
  }

  private async getClient(): Promise<paypal.core.PayPalHttpClient> {
    try {
      let integration;
      try {
        integration = await this.integrationsService.findBySlug('paypal');
      } catch (e) {
        // Ignore
      }

      const clientId =
        integration?.credentials?.clientId ||
        this.configService.get('PAYPAL_CLIENT_ID');
      const clientSecret =
        integration?.credentials?.clientSecret ||
        this.configService.get('PAYPAL_CLIENT_SECRET');
      const mode =
        integration?.credentials?.mode ||
        this.configService.get('PAYPAL_MODE') ||
        'sandbox';

      if (!clientId || !clientSecret) {
        throw new BadRequestException('PayPal credentials missing');
      }

      const key = `${clientId}:${clientSecret}:${mode}`;
      if (this.client && this.currentKey === key) {
        return this.client;
      }

      const environment =
        mode === 'live'
          ? new paypal.core.LiveEnvironment(clientId, clientSecret)
          : new paypal.core.SandboxEnvironment(clientId, clientSecret);

      this.client = new paypal.core.PayPalHttpClient(environment);
      this.currentKey = key;
      this.logger.log(`PayPal provider initialized/updated in ${mode} mode`);
      return this.client;
    } catch (error) {
      this.logger.error('Failed to initialize PayPal provider', error);
      throw new BadRequestException('PayPal provider initialization failed');
    }
  }

  private async checkInitialized() {
    return await this.getClient();
  }

  async createOrder(amount: number, currency: string, items: any[] = []) {
    const client = await this.checkInitialized();
    const frontendUrl = this.configService.get('FRONTEND_URL');

    if (!frontendUrl) {
      this.logger.error('FRONTEND_URL is not defined in configuration');
      throw new BadRequestException(
        'System configuration error: FRONTEND_URL missing',
      );
    }

    // Ensure no trailing slash for cleaner URLs
    const baseUrl = frontendUrl.replace(/\/$/, '');

    try {
      // Calculate item total from items to ensure it matches amount breakdown
      const itemTotal = items.reduce((sum, item) => {
        return (
          sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity)
        );
      }, 0);

      // Round to 2 decimals
      const itemTotalFixed = parseFloat(itemTotal.toFixed(2));
      const amountFixed = parseFloat(amount.toFixed(2));

      this.logger.log(
        `PayPal CreateOrder - Amount: ${amountFixed}, ItemTotal: ${itemTotalFixed}, Items: ${items.length}`,
      );

      const breakdown: any = {
        item_total: {
          currency_code: currency,
          value: itemTotalFixed.toFixed(2),
        },
      };

      // Calculate difference (Tax, Shipping, Discount)
      // If amount > itemTotal, difference is Tax/Shipping
      // If amount < itemTotal, difference is Discount
      const diff = amountFixed - itemTotalFixed;

      this.logger.log(`PayPal CreateOrder - Diff: ${diff}`);

      if (diff > 0.001) {
        breakdown.tax_total = {
          currency_code: currency,
          value: diff.toFixed(2),
        };
      } else if (diff < -0.001) {
        breakdown.discount = {
          currency_code: currency,
          value: Math.abs(diff).toFixed(2),
        };
      }

      const requestBody = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amountFixed.toFixed(2),
              breakdown: breakdown,
            },
            items: items.map((item) => ({
              name: item.name ? item.name.substring(0, 127) : 'Item',
              quantity: parseInt(item.quantity).toString(), // Ensure integer string
              unit_amount: {
                currency_code: currency,
                value: item.unit_amount.value,
              },
              category: 'DIGITAL_GOODS', // Usually safer for courses/products
            })),
            application_context: {
              return_url: `${baseUrl}/checkout/success`,
              cancel_url: `${baseUrl}/checkout?canceled=true`,
              user_action: 'PAY_NOW',
            },
          },
        ],
      };

      // Log request body for debugging
      // this.logger.debug(JSON.stringify(requestBody, null, 2));

      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody(requestBody);

      const response = await client.execute(request);
      const result = response.result;

      if (!result) {
        throw new Error('PayPal API returned no result');
      }

      const links = result.links || [];
      const approveLink = links.find((link: any) => link.rel === 'approve');

      if (!approveLink) {
        this.logger.warn(
          `PayPal Order Created but 'approve' link missing. Order ID: ${result.id}. Status: ${result.status}. Links: ${JSON.stringify(links)}`,
        );
      }

      return {
        orderId: result.id,
        links: links,
        status: result.status,
        url: approveLink ? approveLink.href : null,
      };
    } catch (error: any) {
      this.logger.error(
        `PayPal create order failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `PayPal create order failed: ${error.message}`,
      );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: any = {},
  ) {
    const client = await this.checkInitialized();
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            custom_id: metadata.orderId,
          },
        ],
        application_context: {
          return_url: `${this.configService.get('APP_URL')}/payment/success`,
          cancel_url: `${this.configService.get('APP_URL')}/payment/cancel`,
        },
      });

      const response = await client.execute(request);
      return {
        id: response.result.id,
        status: response.result.status,
        links: response.result.links,
      };
    } catch (error: any) {
      this.logger.error(`Create PayPal Order failed: ${error.message}`);
      throw new BadRequestException(`PayPal error: ${error.message}`);
    }
  }

  async confirmPayment(orderId: string) {
    const client = await this.checkInitialized();
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});
      const response = await client.execute(request);
      return {
        success: response.result.status === 'COMPLETED',
        data: response.result,
      };
    } catch (error: any) {
      throw new BadRequestException(`PayPal capture failed: ${error.message}`);
    }
  }

  async createRefund(captureId: string, amount?: number) {
    const client = await this.checkInitialized();
    try {
      const request = new paypal.payments.CapturesRefundRequest(captureId);
      if (amount) {
        request.requestBody({
          amount: {
            value: amount.toString(),
            currency_code: 'USD', // Should be dynamic
          },
        });
      }
      const response = await client.execute(request);
      return response.result;
    } catch (error: any) {
      throw new BadRequestException(`PayPal refund failed: ${error.message}`);
    }
  }

  async createSubscription(planId: string, subscriber: any) {
    // PayPal Subscriptions API is different from Orders API
    // Basic implementation placeholder
    throw new BadRequestException(
      'PayPal subscriptions not fully implemented yet',
    );
  }

  async cancelSubscription(subscriptionId: string) {
    // Placeholder
    throw new BadRequestException(
      'PayPal subscriptions not fully implemented yet',
    );
  }

  async verifyWebhookSignature(
    payload: any,
    signature: string,
  ): Promise<boolean> {
    // PayPal webhook verification requires calling their API
    // Placeholder logic
    return true;
  }

  async handleWebhook(event: any) {
    this.logger.log(`Handling PayPal webhook event: ${event.event_type}`);
    // Implement event handling
    return { handled: true, type: event.event_type };
  }
}
