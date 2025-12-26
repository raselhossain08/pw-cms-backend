/**
 * Database Cleanup Script for Chat Conversations
 * 
 * This script will:
 * 1. Find and display invalid conversations
 * 2. Clean up orphaned messages
 * 3. Fix conversations with invalid participant references
 * 
 * Run with: npm run ts-node scripts/cleanup-chat.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ChatService } from '../src/chat/chat.service';

async function bootstrap() {
    console.log('🔍 Starting chat database cleanup...\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const chatService = app.get(ChatService);

    try {
        // Run the cleanup
        const result = await chatService.cleanupInvalidConversations();

        console.log('\n✅ Cleanup Results:');
        console.log(`   - Invalid conversations removed: ${result.deletedConversations}`);
        console.log(`   - Orphaned messages removed: ${result.deletedMessages}`);

        if (result.deletedConversations === 0 && result.deletedMessages === 0) {
            console.log('\n✨ Database is clean! No invalid data found.');
        } else {
            console.log('\n🎉 Cleanup completed successfully!');
        }
    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        console.error(error.stack);
    } finally {
        await app.close();
    }
}

bootstrap();
