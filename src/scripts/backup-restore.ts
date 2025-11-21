#!/usr/bin/env node

/**
 * Backup and Restore Script for MongoDB Data
 * This script can backup data to JSON files and restore from them
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

interface BackupData {
    timestamp: string;
    source: string;
    collections: {
        headers: any[];
        footers: any[];
        uploadedFiles: any[];
    };
}

class DataBackupRestore {
    private readonly logger = new Logger('DataBackupRestore');
    private connection: Connection;

    async backup(databaseUri?: string): Promise<string> {
        const uri = databaseUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_db';
        const backupDir = path.join(process.cwd(), 'migration-backup');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.json`);

        try {
            this.logger.log('💾 Starting data backup...');
            this.logger.log(`📍 Source: ${uri.replace(/\/\/.*@/, '//***@')}`);

            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Connect to database
            this.connection = createConnection(uri);
            await this.connection.asPromise();
            this.logger.log('✅ Connected to database');

            // Create models
            const HeaderModel = this.connection.model('Header', HeaderSchema);
            const FooterModel = this.connection.model('Footer', FooterSchema);
            const UploadedFileModel = this.connection.model('UploadedFile', UploadedFileSchema);

            // Fetch data
            this.logger.log('📦 Fetching data from collections...');
            const [headers, footers, uploadedFiles] = await Promise.all([
                HeaderModel.find({}).lean(),
                FooterModel.find({}).lean(),
                UploadedFileModel.find({}).lean()
            ]);

            const backupData: BackupData = {
                timestamp: new Date().toISOString(),
                source: uri.replace(/\/\/.*@/, '//***@'),
                collections: {
                    headers,
                    footers,
                    uploadedFiles
                }
            };

            // Write backup file
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

            // Log summary
            this.logger.log('✅ Backup completed successfully!');
            this.logger.log(`📄 Backup file: ${backupPath}`);
            this.logger.log('📊 Collections backed up:');
            this.logger.log(`   📋 Headers: ${headers.length} documents`);
            this.logger.log(`   📋 Footers: ${footers.length} documents`);
            this.logger.log(`   📋 Uploaded Files: ${uploadedFiles.length} documents`);

            return backupPath;

        } catch (error) {
            this.logger.error('❌ Backup failed:', error.message);
            throw error;
        } finally {
            if (this.connection) {
                await this.connection.close();
                this.logger.log('🔐 Database connection closed');
            }
        }
    }

    async restore(backupPath: string, targetUri?: string): Promise<void> {
        const uri = targetUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_db';

        try {
            this.logger.log('🔄 Starting data restore...');
            this.logger.log(`📄 Backup file: ${backupPath}`);
            this.logger.log(`📍 Target: ${uri.replace(/\/\/.*@/, '//***@')}`);

            // Read backup file
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }

            const backupData: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
            this.logger.log(`📅 Backup created: ${backupData.timestamp}`);

            // Connect to database
            this.connection = createConnection(uri);
            await this.connection.asPromise();
            this.logger.log('✅ Connected to database');

            // Create models
            const HeaderModel = this.connection.model('Header', HeaderSchema);
            const FooterModel = this.connection.model('Footer', FooterSchema);
            const UploadedFileModel = this.connection.model('UploadedFile', UploadedFileSchema);

            // Restore each collection
            await this.restoreCollection('Headers', HeaderModel, backupData.collections.headers);
            await this.restoreCollection('Footers', FooterModel, backupData.collections.footers);
            await this.restoreCollection('Uploaded Files', UploadedFileModel, backupData.collections.uploadedFiles);

            this.logger.log('✅ Restore completed successfully!');

        } catch (error) {
            this.logger.error('❌ Restore failed:', error.message);
            throw error;
        } finally {
            if (this.connection) {
                await this.connection.close();
                this.logger.log('🔐 Database connection closed');
            }
        }
    }

    private async restoreCollection(name: string, model: Model<any>, data: any[]): Promise<void> {
        try {
            this.logger.log(`📦 Restoring ${name}...`);

            if (data.length === 0) {
                this.logger.log(`   ℹ️  No data to restore for ${name}`);
                return;
            }

            // Clear existing data
            const existingCount = await model.countDocuments();
            if (existingCount > 0) {
                this.logger.log(`   🗑️  Clearing ${existingCount} existing documents...`);
                await model.deleteMany({});
            }

            // Insert new data
            const result = await model.insertMany(data, { ordered: false });
            this.logger.log(`   ✅ Restored ${result.length} documents for ${name}`);

        } catch (error) {
            this.logger.error(`   ❌ Failed to restore ${name}:`, error.message);
            throw error;
        }
    }

    async listBackups(): Promise<string[]> {
        const backupDir = path.join(process.cwd(), 'migration-backup');

        if (!fs.existsSync(backupDir)) {
            this.logger.log('📂 No backup directory found');
            return [];
        }

        const files = fs.readdirSync(backupDir)
            .filter(file => file.endsWith('.json') && file.startsWith('backup-'))
            .sort()
            .reverse(); // Most recent first

        this.logger.log('📂 Available backups:');
        files.forEach((file, index) => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            this.logger.log(`   ${index + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB, ${stats.mtime.toLocaleDateString()})`);
        });

        return files.map(file => path.join(backupDir, file));
    }
}

async function runCommand() {
    const command = process.argv[2];
    const dataBackupRestore = new DataBackupRestore();

    try {
        switch (command) {
            case 'backup':
                const sourceUri = process.argv[3];
                const backupPath = await dataBackupRestore.backup(sourceUri);
                console.log(`\n💾 Backup created successfully: ${backupPath}`);
                break;

            case 'restore':
                const restorePath = process.argv[3];
                const targetUri = process.argv[4];

                if (!restorePath) {
                    console.error('❌ Please provide backup file path');
                    console.log('Usage: npm run backup:restore restore <backup-file-path> [target-uri]');
                    process.exit(1);
                }

                await dataBackupRestore.restore(restorePath, targetUri);
                console.log('\n✅ Restore completed successfully!');
                break;

            case 'list':
                await dataBackupRestore.listBackups();
                break;

            default:
                console.log('📚 MongoDB Backup & Restore Tool');
                console.log('');
                console.log('Usage:');
                console.log('  npm run backup:restore backup [source-uri]     - Create backup');
                console.log('  npm run backup:restore restore <file> [uri]    - Restore from backup');
                console.log('  npm run backup:restore list                    - List available backups');
                console.log('');
                console.log('Examples:');
                console.log('  npm run backup:restore backup');
                console.log('  npm run backup:restore backup "mongodb://localhost:27017/cms_db"');
                console.log('  npm run backup:restore restore migration-backup/backup-2024-01-01.json');
                console.log('  npm run backup:restore list');
                break;
        }
    } catch (error) {
        console.error('\n💥 Operation failed:', error.message);
        process.exit(1);
    }
}

// Run command if this script is executed directly
if (require.main === module) {
    runCommand();
}

export { DataBackupRestore };