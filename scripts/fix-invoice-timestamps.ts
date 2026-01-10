#!/usr/bin/env ts-node

/**
 * Fix Invoice Timestamps Migration Script
 * 
 * This script fixes invoices that have empty objects {} for timestamp fields
 * instead of proper Date objects.
 * 
 * Usage: npm run fix:invoice-timestamps
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Invoice } from '../src/payments/entities/invoice.entity';

async function fixInvoiceTimestamps() {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    try {
        const invoiceModel: Model<Invoice> = app.get(getModelToken(Invoice.name));
        console.log('Connected to MongoDB via NestJS');

        // Find all invoices with problematic timestamps using aggregation
        const pipeline = [
            {
                $match: {
                    $or: [
                        { createdAt: { $type: 'object', $not: { $type: 'date' } } },
                        { updatedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { invoiceDate: { $type: 'object', $not: { $type: 'date' } } },
                        { dueDate: { $type: 'object', $not: { $type: 'date' } } },
                        { paidAt: { $type: 'object', $not: { $type: 'date' } } },
                        { createdAt: { $exists: false } },
                        { updatedAt: { $exists: false } }
                    ]
                }
            }
        ];

        const invoices = await invoiceModel.aggregate(pipeline);

        console.log(`Found ${invoices.length} invoices with timestamp issues`);

        let fixed = 0;
        for (const invoice of invoices) {
            try {
                let needsUpdate = false;
                const update: any = {};

                // Helper function to check if a value is an empty object
                const isEmptyObject = (val: any) => {
                    return val && typeof val === 'object' && !(val instanceof Date) && Object.keys(val).length === 0;
                };

                // Fix createdAt - extract from ObjectId if missing or empty
                if (!invoice.createdAt || isEmptyObject(invoice.createdAt)) {
                    const createdFromId = invoice._id.getTimestamp();
                    update.createdAt = createdFromId;
                    needsUpdate = true;
                    console.log(`Fixed createdAt for invoice ${invoice.invoiceNumber}: ${createdFromId.toISOString()}`);
                }

                // Fix updatedAt - use createdAt as fallback if missing or empty
                if (!invoice.updatedAt || isEmptyObject(invoice.updatedAt)) {
                    const updatedAt = invoice.createdAt || invoice._id.getTimestamp();
                    update.updatedAt = updatedAt;
                    needsUpdate = true;
                    console.log(`Fixed updatedAt for invoice ${invoice.invoiceNumber}: ${updatedAt.toISOString()}`);
                }

                // Fix invoiceDate - only if it's an empty object (leave undefined if not set)
                if (isEmptyObject(invoice.invoiceDate)) {
                    update.$unset = { invoiceDate: "" };
                    needsUpdate = true;
                    console.log(`Removed empty invoiceDate for invoice ${invoice.invoiceNumber}`);
                } else if (invoice.status === 'paid' && !invoice.invoiceDate) {
                    // If invoice is paid but has no invoiceDate, set it to createdAt
                    update.invoiceDate = update.createdAt || invoice.createdAt || invoice._id.getTimestamp();
                    needsUpdate = true;
                    console.log(`Set invoiceDate for paid invoice ${invoice.invoiceNumber}`);
                }

                // Fix dueDate - only if it's an empty object (leave undefined if not set)
                if (isEmptyObject(invoice.dueDate)) {
                    if (!update.$unset) update.$unset = {};
                    update.$unset.dueDate = "";
                    needsUpdate = true;
                    console.log(`Removed empty dueDate for invoice ${invoice.invoiceNumber}`);
                }

                // Fix paidAt - only if it's an empty object (leave undefined if not set)
                if (isEmptyObject(invoice.paidAt)) {
                    if (!update.$unset) update.$unset = {};
                    update.$unset.paidAt = "";
                    needsUpdate = true;
                    console.log(`Removed empty paidAt for invoice ${invoice.invoiceNumber}`);
                } else if (invoice.status === 'paid' && !invoice.paidAt) {
                    // If invoice is paid but has no paidAt, set it to updatedAt
                    update.paidAt = update.updatedAt || invoice.updatedAt || invoice.createdAt;
                    needsUpdate = true;
                    console.log(`Set paidAt for paid invoice ${invoice.invoiceNumber}`);
                }

                // Update the invoice if needed
                if (needsUpdate) {
                    await invoiceModel.updateOne({ _id: invoice._id }, update);
                    fixed++;
                }
            } catch (error: any) {
                console.error(`Error processing invoice ${invoice.invoiceNumber}:`, error.message);
            }
        }

        console.log(`\nMigration completed!`);
        console.log(`Total invoices processed: ${invoices.length}`);
        console.log(`Invoices fixed: ${fixed}`);

        // Verify the fix using aggregation
        const verifyPipeline = [
            {
                $match: {
                    $or: [
                        { createdAt: { $type: 'object', $not: { $type: 'date' } } },
                        { updatedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { invoiceDate: { $type: 'object', $not: { $type: 'date' } } },
                        { dueDate: { $type: 'object', $not: { $type: 'date' } } },
                        { paidAt: { $type: 'object', $not: { $type: 'date' } } }
                    ]
                }
            },
            { $count: 'count' }
        ];

        const verifyResult = await invoiceModel.aggregate(verifyPipeline);
        const remainingIssues = verifyResult.length > 0 ? verifyResult[0].count : 0;

        console.log(`Remaining invoices with empty object timestamps: ${remainingIssues}`);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await app.close();
        console.log('Application closed');
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    fixInvoiceTimestamps()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export { fixInvoiceTimestamps };