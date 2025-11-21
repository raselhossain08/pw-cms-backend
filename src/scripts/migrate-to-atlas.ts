#!/usr/bin/env node

/**
 * Migration Script for Moving Data to MongoDB Atlas
 * This script exports data from local MongoDB and imports to Atlas
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, connect, disconnect, Connection, createConnection } from 'mongoose';
import { Header, HeaderSchema } from '../modules/header/entities/header.entity';
import { Footer, FooterSchema } from '../modules/footer/entities/footer.entity';
import { UploadedFile, UploadedFileSchema } from '../modules/upload/entities/uploaded-file.entity';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

interface MigrationResult {
    source: string;
    target: string;
    collections: {
        headers: { exported: number; imported: number; errors: string[] };
        footers: { exported: number; imported: number; errors: string[] };
        uploadedFiles: { exported: number; imported: number; errors: string[] };
    };
    totalExported: number;
    totalImported: number;
    errors: string[];
}

class AtlasMigration {
    private readonly logger = new Logger('AtlasMigration');
    private sourceConnection: Connection;
    private targetConnection: Connection;

    private readonly localUri = 'mongodb://localhost:27017/cms_db';
    private readonly atlasUri = 'mongodb+srv://personal_wings:AsNaRe2mqhD5292v@cluster0.ho9audm.mongodb.net/personal-wings-cms';

    async migrate(): Promise<MigrationResult> {
        const result: MigrationResult = {
            source: this.localUri,
            target: this.atlasUri,
            collections: {
                headers: { exported: 0, imported: 0, errors: [] },
                footers: { exported: 0, imported: 0, errors: [] },
                uploadedFiles: { exported: 0, imported: 0, errors: [] },
            },
            totalExported: 0,
            totalImported: 0,
            errors: []
        };

        try {
            this.logger.log('🚀 Starting migration to MongoDB Atlas...');

            // Connect to both databases
            await this.connectToDatabases();

            // Create models for both connections
            const { sourceModels, targetModels } = this.createModels();

            // Migrate each collection
            await this.migrateCollection('headers', sourceModels.Header, targetModels.Header, result);
            await this.migrateCollection('footers', sourceModels.Footer, targetModels.Footer, result);
            await this.migrateCollection('uploadedFiles', sourceModels.UploadedFile, targetModels.UploadedFile, result);

            // Calculate totals
            result.totalExported = Object.values(result.collections).reduce((sum, col) => sum + col.exported, 0);
            result.totalImported = Object.values(result.collections).reduce((sum, col) => sum + col.imported, 0);

            this.logger.log('✅ Migration completed successfully!');
            this.printMigrationSummary(result);

        } catch (error) {
            this.logger.error('❌ Migration failed:', error.message);
            result.errors.push(`General migration error: ${error.message}`);
            throw error;
        } finally {
            await this.closeConnections();
        }

        return result;
    }

    private async connectToDatabases(): Promise<void> {
        try {
            this.logger.log('📡 Connecting to source database (local MongoDB)...');
            this.sourceConnection = createConnection(this.localUri);
            await this.sourceConnection.asPromise();
            this.logger.log('✅ Connected to source database');

            this.logger.log('📡 Connecting to target database (MongoDB Atlas)...');
            this.targetConnection = createConnection(this.atlasUri);
            await this.targetConnection.asPromise();
            this.logger.log('✅ Connected to target database');
        } catch (error) {
            throw new Error(`Failed to connect to databases: ${error.message}`);
        }
    }

    private createModels() {
        const sourceModels = {
            Header: this.sourceConnection.model('Header', HeaderSchema),
            Footer: this.sourceConnection.model('Footer', FooterSchema),
            UploadedFile: this.sourceConnection.model('UploadedFile', UploadedFileSchema)
        };

        const targetModels = {
            Header: this.targetConnection.model('Header', HeaderSchema),
            Footer: this.targetConnection.model('Footer', FooterSchema),
            UploadedFile: this.targetConnection.model('UploadedFile', UploadedFileSchema)
        };

        return { sourceModels, targetModels };
    }

    private async migrateCollection(
        collectionName: keyof MigrationResult['collections'],
        sourceModel: Model<any>,
        targetModel: Model<any>,
        result: MigrationResult
    ): Promise<void> {
        try {
            this.logger.log(`📦 Migrating ${collectionName} collection...`);

            // Export data from source
            const sourceData = await sourceModel.find({}).lean();
            result.collections[collectionName].exported = sourceData.length;

            if (sourceData.length === 0) {
                this.logger.log(`   ℹ️  No data found in ${collectionName} collection`);
                return;
            }

            this.logger.log(`   📤 Exported ${sourceData.length} documents from ${collectionName}`);

            // Check if data already exists in target
            const existingCount = await targetModel.countDocuments();
            if (existingCount > 0) {
                this.logger.warn(`   ⚠️  Target ${collectionName} collection already has ${existingCount} documents`);
                this.logger.log(`   🗑️  Clearing existing data in target collection...`);
                await targetModel.deleteMany({});
            }

            // Import data to target
            const importedData = await targetModel.insertMany(sourceData, { ordered: false });
            result.collections[collectionName].imported = importedData.length;

            this.logger.log(`   📥 Imported ${importedData.length} documents to ${collectionName}`);

        } catch (error) {
            const errorMsg = `Failed to migrate ${collectionName}: ${error.message}`;
            this.logger.error(`   ❌ ${errorMsg}`);
            result.collections[collectionName].errors.push(errorMsg);
            result.errors.push(errorMsg);
        }
    }

    private async closeConnections(): Promise<void> {
        try {
            if (this.sourceConnection) {
                await this.sourceConnection.close();
                this.logger.log('🔐 Source database connection closed');
            }
            if (this.targetConnection) {
                await this.targetConnection.close();
                this.logger.log('🔐 Target database connection closed');
            }
        } catch (error) {
            this.logger.warn('⚠️  Error closing connections:', error.message);
        }
    }

    private printMigrationSummary(result: MigrationResult): void {
        this.logger.log('\n📊 Migration Summary:');
        this.logger.log('═'.repeat(50));
        this.logger.log(`📍 Source: ${result.source.replace(/\/\/.*@/, '//***@')}`);
        this.logger.log(`📍 Target: ${result.target.replace(/\/\/.*@/, '//***@')}`);
        this.logger.log('');

        Object.entries(result.collections).forEach(([name, stats]) => {
            const status = stats.errors.length > 0 ? '❌' : '✅';
            this.logger.log(`${status} ${name.toUpperCase()}:`);
            this.logger.log(`   📤 Exported: ${stats.exported}`);
            this.logger.log(`   📥 Imported: ${stats.imported}`);
            if (stats.errors.length > 0) {
                this.logger.log(`   ⚠️  Errors: ${stats.errors.length}`);
            }
        });

        this.logger.log('');
        this.logger.log(`📊 TOTALS:`);
        this.logger.log(`   📤 Total Exported: ${result.totalExported}`);
        this.logger.log(`   📥 Total Imported: ${result.totalImported}`);
        this.logger.log(`   ❌ Total Errors: ${result.errors.length}`);

        if (result.errors.length > 0) {
            this.logger.log('\n🚨 Errors encountered:');
            result.errors.forEach(error => this.logger.error(`   - ${error}`));
        }

        this.logger.log('═'.repeat(50));
    }

    async exportToBackup(): Promise<string> {
        const backupDir = path.join(process.cwd(), 'migration-backup');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

        try {
            this.logger.log('💾 Creating backup of current data...');

            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            await this.connectToDatabases();
            const { sourceModels } = this.createModels();

            const backupData = {
                timestamp: new Date().toISOString(),
                source: this.localUri.replace(/\/\/.*@/, '//***@'),
                collections: {
                    headers: await sourceModels.Header.find({}).lean(),
                    footers: await sourceModels.Footer.find({}).lean(),
                    uploadedFiles: await sourceModels.UploadedFile.find({}).lean()
                }
            };

            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
            this.logger.log(`✅ Backup created: ${backupPath}`);

            return backupPath;
        } catch (error) {
            this.logger.error('❌ Backup creation failed:', error.message);
            throw error;
        } finally {
            await this.closeConnections();
        }
    }
}

async function runMigration() {
    const migration = new AtlasMigration();

    try {
        // Create backup first
        const backupPath = await migration.exportToBackup();
        console.log(`\n💾 Backup created at: ${backupPath}`);
        console.log('📝 You can restore from this backup if needed\n');

        // Run migration
        const result = await migration.migrate();

        if (result.errors.length === 0) {
            console.log('\n🎉 Migration completed successfully!');
            console.log('🔄 Please restart your application to use the new database connection.');
        } else {
            console.log('\n⚠️  Migration completed with some errors. Check the logs above.');
        }

    } catch (error) {
        console.error('\n💥 Migration failed:', error.message);
        console.log('💡 You can restore your data from the backup if needed.');
        process.exit(1);
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration();
}

export { AtlasMigration, runMigration };