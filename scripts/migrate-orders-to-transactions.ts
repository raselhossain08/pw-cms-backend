import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Order, OrderStatus } from '../src/orders/entities/order.entity';
import {
    Transaction,
    TransactionStatus,
    TransactionType,
} from '../src/payments/entities/transaction.entity';

/**
 * Migration script to create Transaction records for existing completed Orders
 * Run: npm run ts-node scripts/migrate-orders-to-transactions.ts
 */
async function migrateOrdersToTransactions() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const orderModel: Model<Order> = app.get(getModelToken(Order.name));
    const transactionModel: Model<any> = app.get(
        getModelToken('Transaction'),
    );

    console.log('🔄 Starting migration: Orders → Transactions');

    try {
        // Find all completed orders without a transaction
        const completedOrders = await orderModel
            .find({
                status: OrderStatus.COMPLETED,
                paidAt: { $exists: true },
            })
            .populate('user')
            .exec();

        console.log(`📦 Found ${completedOrders.length} completed orders`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const order of completedOrders) {
            try {
                // Check if transaction already exists for this order
                const existingTransaction = await transactionModel.findOne({
                    orderId: (order as any)._id.toString(),
                });

                if (existingTransaction) {
                    console.log(`⏭️  Skipping order ${order.orderNumber} - transaction already exists`);
                    skippedCount++;
                    continue;
                }

                // Create transaction record
                const transactionData = {
                    transactionId: `txn_migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    user: order.user,
                    amount: order.total,
                    currency: 'USD',
                    type: 'payment',
                    status: 'completed',
                    description: `Course purchase - Order ${order.orderNumber}`,
                    gateway: order.paymentMethod === 'stripe' ? 'stripe' : 'paypal',
                    gatewayTransactionId: order.paymentIntentId || order.chargeId || `legacy_${(order as any)._id}`,
                    orderId: (order as any)._id.toString(),
                    processedAt: order.paidAt || (order as any).createdAt || new Date(),
                };

                const transaction = new transactionModel(transactionData);
                await transaction.save();
                console.log(`✅ Created transaction for order ${order.orderNumber} - ${transaction.transactionId}`);
                createdCount++;
            } catch (error: any) {
                console.error(`❌ Error processing order ${order.orderNumber}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Transactions created: ${createdCount}`);
        console.log(`⏭️  Transactions skipped: ${skippedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📦 Total orders processed: ${completedOrders.length}`);
        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

migrateOrdersToTransactions()
    .then(() => {
        console.log('🎉 Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
