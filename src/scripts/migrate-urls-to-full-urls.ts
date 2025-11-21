import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { UploadedFileDocument } from '../modules/upload/entities/uploaded-file.entity';

/**
 * Migration script to update existing database records
 * to store full URLs with hostname instead of relative paths
 */
async function migrateUrlsToFullUrls() {
    console.log('🚀 Starting URL migration to full URLs...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const configService = app.get(ConfigService);
    const uploadedFileModel = app.get(getModelToken('UploadedFile')) as Model<UploadedFileDocument>;

    // Get base URL
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const port = configService.get<string>('PORT', '8000');

    let baseUrl: string;
    if (nodeEnv === 'production') {
        baseUrl = configService.get<string>('BASE_URL', 'https://cms.personalwings.site');
    } else {
        baseUrl = `http://localhost:${port}`;
    }

    console.log(`🌐 Using base URL: ${baseUrl}`);
    console.log(`🔧 Environment: ${nodeEnv}`);

    try {
        // Find all files that have relative URLs (starting with /)
        const filesToUpdate = await uploadedFileModel.find({
            url: { $regex: '^/', $options: 'i' } // URLs starting with /
        }).lean();

        console.log(`📁 Found ${filesToUpdate.length} files with relative URLs to update`);

        if (filesToUpdate.length === 0) {
            console.log('✅ No files need URL migration');
            await app.close();
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const file of filesToUpdate) {
            try {
                const relativeUrl = file.url;
                const fullUrl = `${baseUrl}${relativeUrl}`;

                await uploadedFileModel.updateOne(
                    { _id: file._id },
                    { $set: { url: fullUrl } }
                );

                updatedCount++;

                if (updatedCount % 10 === 0) {
                    console.log(`📝 Updated ${updatedCount}/${filesToUpdate.length} files...`);
                }

                console.log(`✅ Updated: ${file.filename}`);
                console.log(`   From: ${relativeUrl}`);
                console.log(`   To:   ${fullUrl}`);

            } catch (error) {
                errorCount++;
                const errorMsg = `Failed to update ${file.filename}: ${error.message}`;
                console.error(`❌ ${errorMsg}`);
                errors.push(errorMsg);
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successfully updated: ${updatedCount} files`);
        console.log(`❌ Errors: ${errorCount} files`);
        console.log(`🎯 Total processed: ${filesToUpdate.length} files`);

        if (errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            errors.forEach(error => console.log(`   ${error}`));
        }

        console.log('\n🎉 URL migration completed!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await app.close();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateUrlsToFullUrls().catch(console.error);
}

export default migrateUrlsToFullUrls;