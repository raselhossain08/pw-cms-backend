#!/usr/bin/env node

/**
 * Migration Script for Existing Upload Files
 * This script scans the uploads directory and adds existing files to the database
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UploadService } from '../modules/upload/upload.service';

async function runMigration() {
    console.log('🚀 Starting file migration script...');

    try {
        // Create application context
        const app = await NestFactory.createApplicationContext(AppModule);

        // Get upload service
        const uploadService = app.get(UploadService);

        // Run migration
        console.log('📂 Scanning uploads directory...');
        const result = await uploadService.migrateExistingFiles();

        console.log('\n✅ Migration Results:');
        console.log(`   📁 Files migrated: ${result.migratedCount}`);
        console.log(`   ⏭️  Files skipped: ${result.skippedCount}`);

        if (result.errors.length > 0) {
            console.log(`   ❌ Errors: ${result.errors.length}`);
            result.errors.forEach(error => console.log(`      - ${error}`));
        }

        // Close application
        await app.close();

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration();
}

export { runMigration };