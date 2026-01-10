#!/usr/bin/env ts-node

/**
 * Fix Transaction Timestamps Migration Script
 * 
 * This script fixes transactions that have empty objects {} for timestamp fields
 * instead of proper Date objects. This commonly happens during data migration
 * or when schema changes are not properly handled.
 * 
 * Usage: npm run fix-transaction-timestamps
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Transaction } from '../src/payments/entities/transaction.entity';

async function fixTransactionTimestamps() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const transactionModel: Model<Transaction> = app.get(getModelToken(Transaction.name));
        console.log('Connected to MongoDB via NestJS');

        // Find all transactions with problematic timestamps using aggregation
        const pipeline = [
            {
                $match: {
                    $or: [
                        { createdAt: { $type: 'object', $not: { $type: 'date' } } },
                        { updatedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { processedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { refundedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { createdAt: { $exists: false } },
                        { updatedAt: { $exists: false } }
                    ]
                }
            }
        ];

        const transactions = await transactionModel.aggregate(pipeline);

        console.log(`Found ${transactions.length} transactions with timestamp issues`);

        let fixed = 0;
        for (const transaction of transactions) {
            let needsUpdate = false;
            const update: any = {};

            // Helper function to check if a value is an empty object
            const isEmptyObject = (val: any) => {
                return val && typeof val === 'object' && !(val instanceof Date) && Object.keys(val).length === 0;
            };

            // Fix createdAt - extract from ObjectId if missing or empty
            if (!transaction.createdAt || isEmptyObject(transaction.createdAt)) {
                const createdFromId = transaction._id.getTimestamp();
                update.createdAt = createdFromId;
                needsUpdate = true;
                console.log(`Fixed createdAt for transaction ${transaction.transactionId}: ${createdFromId.toISOString()}`);
            }

            // Fix updatedAt - use createdAt as fallback if missing or empty
            if (!transaction.updatedAt || isEmptyObject(transaction.updatedAt)) {
                const updatedAt = transaction.createdAt || transaction._id.getTimestamp();
                update.updatedAt = updatedAt;
                needsUpdate = true;
                console.log(`Fixed updatedAt for transaction ${transaction.transactionId}: ${updatedAt.toISOString()}`);
            }

            // Fix processedAt - only if it's an empty object (leave undefined if not set)
            if (isEmptyObject(transaction.processedAt)) {
                update.$unset = { processedAt: "" };
                needsUpdate = true;
                console.log(`Removed empty processedAt for transaction ${transaction.transactionId}`);
            } else if (transaction.status === 'completed' && !transaction.processedAt) {
                // If transaction is completed but has no processedAt, set it to updatedAt
                update.processedAt = update.updatedAt || transaction.updatedAt || transaction.createdAt;
                needsUpdate = true;
                console.log(`Set processedAt for completed transaction ${transaction.transactionId}`);
            }

            // Fix refundedAt - only if it's an empty object (leave undefined if not set)
            if (isEmptyObject(transaction.refundedAt)) {
                if (!update.$unset) update.$unset = {};
                update.$unset.refundedAt = "";
                needsUpdate = true;
                console.log(`Removed empty refundedAt for transaction ${transaction.transactionId}`);
            }

            // Update the transaction if needed
            if (needsUpdate) {
                await transactionModel.updateOne({ _id: transaction._id }, update);
                fixed++;
            }
        }

        console.log(`\nMigration completed!`);
        console.log(`Total transactions processed: ${transactions.length}`);
        console.log(`Transactions fixed: ${fixed}`);

        // Verify the fix using aggregation
        const verifyPipeline = [
            {
                $match: {
                    $or: [
                        { createdAt: { $type: 'object', $not: { $type: 'date' } } },
                        { updatedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { processedAt: { $type: 'object', $not: { $type: 'date' } } },
                        { refundedAt: { $type: 'object', $not: { $type: 'date' } } }
                    ]
                }
            },
            { $count: 'count' }
        ];

        const verifyResult = await transactionModel.aggregate(verifyPipeline);
        const remainingIssues = verifyResult.length > 0 ? verifyResult[0].count : 0;

        console.log(`Remaining transactions with empty object timestamps: ${remainingIssues}`);

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
    fixTransactionTimestamps()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export { fixTransactionTimestamps };