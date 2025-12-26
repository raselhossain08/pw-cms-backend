export interface PaymentProvider {
  name: string;

  initialize(): Promise<void>;

  createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: any,
  ): Promise<any>;

  confirmPayment(paymentId: string): Promise<any>;

  createRefund(paymentId: string, amount?: number): Promise<any>;

  createSubscription(customerId: string, priceId: string): Promise<any>;

  cancelSubscription(subscriptionId: string): Promise<any>;

  verifyWebhookSignature(payload: any, signature: string): Promise<boolean>;

  handleWebhook(event: any): Promise<any>;
}
