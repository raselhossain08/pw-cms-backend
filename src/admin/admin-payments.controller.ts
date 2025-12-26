import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Res,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminPaymentsService } from './admin-payments.service';
import {
    CreateInvoiceDto,
    ProcessRefundDto,
    ProcessPayoutDto,
    TransactionFiltersDto,
    InvoiceFiltersDto,
    PayoutFiltersDto,
    AnalyticsFiltersDto,
    ExportFiltersDto,
    ExportFormat,
} from './dto/admin-payments.dto';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPaymentsController {
    constructor(private readonly adminPaymentsService: AdminPaymentsService) { }

    /**
     * Get all transactions with pagination and filters
     * GET /admin/payments/transactions
     */
    @Get('transactions')
    async getAllTransactions(@Query() filters: TransactionFiltersDto) {
        try {
            return await this.adminPaymentsService.getAllTransactions(filters);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get transaction details by ID
     * GET /admin/payments/transactions/:id
     */
    @Get('transactions/:id')
    async getTransactionById(@Param('id') id: string) {
        try {
            return await this.adminPaymentsService.getTransactionById(id);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Process refund for a transaction
     * POST /admin/payments/refund/:transactionId
     */
    @Post('refund/:transactionId')
    async processRefund(
        @Param('transactionId') transactionId: string,
        @Body() refundDto: ProcessRefundDto,
    ) {
        try {
            return await this.adminPaymentsService.processAdminRefund(
                transactionId,
                refundDto,
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get all invoices with pagination and filters
     * GET /admin/payments/invoices
     */
    @Get('invoices')
    async getAllInvoices(@Query() filters: InvoiceFiltersDto) {
        try {
            return await this.adminPaymentsService.getAllInvoices(filters);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get invoice details by ID
     * GET /admin/payments/invoices/:id
     */
    @Get('invoices/:id')
    async getInvoiceById(@Param('id') id: string) {
        try {
            return await this.adminPaymentsService.getInvoiceById(id);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Create a manual invoice
     * POST /admin/payments/invoices
     */
    @Post('invoices')
    async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
        try {
            return await this.adminPaymentsService.createManualInvoice(
                createInvoiceDto,
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Update invoice
     * PUT /admin/payments/invoices/:id
     */
    @Put('invoices/:id')
    async updateInvoice(
        @Param('id') id: string,
        @Body() updateData: Partial<CreateInvoiceDto>,
    ) {
        try {
            return await this.adminPaymentsService.updateInvoice(id, updateData);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Delete invoice (soft delete)
     * DELETE /admin/payments/invoices/:id
     */
    @Delete('invoices/:id')
    async deleteInvoice(@Param('id') id: string) {
        try {
            return await this.adminPaymentsService.deleteInvoice(id);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get all payouts with pagination and filters
     * GET /admin/payments/payouts
     */
    @Get('payouts')
    async getAllPayouts(@Query() filters: PayoutFiltersDto) {
        try {
            return await this.adminPaymentsService.getAllPayouts(filters);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get payout details for instructor
     * GET /admin/payments/payouts/:instructorId
     */
    @Get('payouts/:instructorId')
    async getPayoutDetails(@Param('instructorId') instructorId: string) {
        try {
            return await this.adminPaymentsService.getPayoutDetails(instructorId);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Process payout to instructor
     * POST /admin/payments/payouts/:instructorId/process
     */
    @Post('payouts/:instructorId/process')
    async processInstructorPayout(
        @Param('instructorId') instructorId: string,
        @Body() payoutDto: ProcessPayoutDto,
    ) {
        try {
            return await this.adminPaymentsService.processInstructorPayout(
                instructorId,
                payoutDto,
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get payout history for instructor
     * GET /admin/payments/payouts/:instructorId/history
     */
    @Get('payouts/:instructorId/history')
    async getPayoutHistory(
        @Param('instructorId') instructorId: string,
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        try {
            return await this.adminPaymentsService.getPayoutHistory(
                instructorId,
                parseInt(page),
                parseInt(limit),
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Get payment analytics
     * GET /admin/payments/analytics
     */
    @Get('analytics')
    async getAnalytics(@Query() filters: AnalyticsFiltersDto) {
        try {
            return await this.adminPaymentsService.getPaymentAnalytics(filters);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    /**
     * Export transactions
     * GET /admin/payments/export
     */
    @Get('export')
    async exportTransactions(
        @Query() filters: ExportFiltersDto,
        @Res() res: Response,
    ) {
        try {
            const { format = ExportFormat.CSV, ...queryFilters } = filters;

            const result = await this.adminPaymentsService.exportTransactions(
                queryFilters,
                format as ExportFormat,
            );

            // Set headers for file download
            const filename = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Type', result.contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            return res.status(HttpStatus.OK).send(result.data);
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }
}
