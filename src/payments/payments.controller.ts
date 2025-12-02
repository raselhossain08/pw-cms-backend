import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
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
  @ApiResponse({ status: 200, description: 'Payment verified' })
  async verifyGuestPayment(
    @Param('sessionId') sessionId: string,
    @Body() body: { email: string },
  ) {
    return this.paymentsService.verifyGuestPayment(sessionId, body.email);
  }
}
