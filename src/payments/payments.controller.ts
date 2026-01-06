import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Create payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Req() req,
  ) {
    return this.paymentsService.createPaymentIntent(
      createPaymentIntentDto,
      req.user.id,
    );
  }

  @Post('create-setup-intent')
  @ApiOperation({ summary: 'Create setup intent for saving payment method' })
  @ApiResponse({ status: 201, description: 'Setup intent created' })
  async createSetupIntent(@Req() req) {
    return this.paymentsService.createSetupIntent(req.user.id);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
    @Req() req,
  ) {
    return this.paymentsService.processPayment(processPaymentDto, req.user.id);
  }

  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleStripeWebhook(@Body() body: any, @Req() req) {
    return this.paymentsService.handleStripeWebhook(
      body,
      req.headers['stripe-signature'],
    );
  }

  @Post('webhook/paypal')
  @ApiOperation({ summary: 'PayPal webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePayPalWebhook(@Body() body: any, @Req() req) {
    return this.paymentsService.handlePayPalWebhook(body, req.headers);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transactions' })
  @ApiResponse({ status: 200, description: 'List of transactions' })
  async getUserTransactions(@Req() req) {
    return this.paymentsService.getUserTransactions(req.user.id);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get saved payment methods' })
  @ApiResponse({ status: 200, description: 'List of payment methods' })
  async getPaymentMethods(@Req() req) {
    return this.paymentsService.getPaymentMethods(req.user.id);
  }

  @Post('methods')
  @ApiOperation({ summary: 'Add payment method' })
  @ApiResponse({ status: 201, description: 'Payment method added' })
  async addPaymentMethod(@Body() body: any, @Req() req) {
    return this.paymentsService.addPaymentMethod(
      req.user.id,
      body.paymentMethodId,
      body.isDefault,
    );
  }

  @Post('methods/:id/delete')
  @ApiOperation({ summary: 'Delete payment method' })
  @ApiResponse({ status: 200, description: 'Payment method deleted' })
  async deletePaymentMethod(@Param('id') id: string, @Req() req) {
    return this.paymentsService.deletePaymentMethod(req.user.id, id);
  }

  @Patch('methods/:id/default')
  @ApiOperation({ summary: 'Set default payment method' })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setDefaultPaymentMethod(@Param('id') id: string, @Req() req) {
    return this.paymentsService.setDefaultPaymentMethod(req.user.id, id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get user invoices' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async getUserInvoices(@Req() req) {
    return this.paymentsService.getUserInvoices(req.user.id);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  async getInvoice(@Param('id') id: string, @Req() req) {
    return this.paymentsService.getInvoice(id, req.user.id);
  }

  @Get('invoices/:id/download')
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiResponse({ status: 200, description: 'Invoice download URL' })
  async downloadInvoice(@Param('id') id: string, @Req() req) {
    return this.paymentsService.downloadInvoice(id, req.user.id);
  }

  @Post('refund/:orderId')
  @ApiOperation({ summary: 'Request refund' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async requestRefund(
    @Param('orderId') orderId: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    return this.paymentsService.requestRefund(
      orderId,
      body.reason,
      req.user.id,
    );
  }

  @Post('stripe/create-checkout-session')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async createStripeCheckoutSession(@Body() body: any, @Req() req) {
    return this.paymentsService.createStripeCheckoutSession(body, req.user.id);
  }

  @Post('paypal/create-order')
  @ApiOperation({ summary: 'Create PayPal order' })
  @ApiResponse({ status: 201, description: 'PayPal order created' })
  async createPayPalOrder(@Body() body: any, @Req() req) {
    return this.paymentsService.createPayPalOrder(body, req.user.id);
  }

  @Post('paypal/capture-order/:orderId')
  @ApiOperation({ summary: 'Capture PayPal order' })
  @ApiResponse({ status: 200, description: 'PayPal order captured' })
  async capturePayPalOrder(@Param('orderId') orderId: string, @Req() req) {
    return this.paymentsService.capturePayPalOrder(orderId, req.user.id);
  }

  @Get('stripe/verify-session/:sessionId')
  @ApiOperation({ summary: 'Verify Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Session verified' })
  async verifyStripeSession(@Param('sessionId') sessionId: string, @Req() req) {
    return this.paymentsService.verifyStripeSession(sessionId, req.user.id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Process authenticated checkout' })
  @ApiResponse({ status: 201, description: 'Checkout processed' })
  async checkout(@Body() checkoutDto: any, @Req() req) {
    return this.paymentsService.processCheckout(checkoutDto, req.user.id);
  }
}

import { GuestCheckoutDto } from './dto/guest-checkout.dto';

@ApiTags('Guest Payments')
@Controller('payments/guest')
export class GuestPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Guest checkout - creates user if not exists' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async guestCheckout(@Body() guestCheckoutDto: GuestCheckoutDto) {
    return this.paymentsService.processGuestCheckout(guestCheckoutDto);
  }

  @Post('verify-payment/:sessionId')
  @ApiOperation({ summary: 'Verify guest payment and send confirmation email' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid session or payment not completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Order or payment session not found',
  })
  async verifyGuestPayment(
    @Param('sessionId') sessionId: string,
    @Body() body: { email: string },
  ) {
    try {
      // Validate request body
      if (!body.email) {
        throw new Error('Email is required');
      }

      return await this.paymentsService.verifyGuestPayment(
        sessionId,
        body.email,
      );
    } catch (error) {
      // Log error for debugging
      console.error('[GuestPaymentsController] verifyGuestPayment error:', {
        sessionId,
        email: body.email,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw to let NestJS exception filters handle it
      throw error;
    }
  }
}
