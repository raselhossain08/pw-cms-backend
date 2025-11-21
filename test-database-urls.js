#!/usr/bin/env node

const https = require('https');

/**
 * Test script to verify that database now stores full URLs with hostname
 * Usage: node test-database-urls.js
 */

const BASE_URL = 'https://cms.personalwings.site';

console.log('🔍 Testing database URL storage format...');
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log('━'.repeat(50));

// Test 1: Check upload service status to verify environment
function testUploadStatus() {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/upload/status`;
        console.log(`📊 Testing upload status: ${url}`);

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Upload status:', {
                        status: result.status,
                        baseUrl: result.baseUrl,
                        environment: result.environment,
                        totalFiles: result.totalFilesInDatabase
                    });
                    resolve(result);
                } catch (err) {
                    console.log('❌ Failed to parse status response:', data);
                    reject(err);
                }
            });
        }).on('error', (err) => {
            console.log('❌ Upload status request failed:', err.message);
            reject(err);
        });
    });
}

// Test 2: Get files and check URL format
function testFilesUrlFormat() {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/upload/files?limit=5`;
        console.log(`📁 Testing files URL format: ${url}`);

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📊 Files URL format check:');

                    if (result.files && result.files.length > 0) {
                        result.files.forEach((file, index) => {
                            const isFullUrl = file.url.startsWith('http');
                            const urlType = isFullUrl ? '✅ Full URL' : '❌ Relative URL';
                            console.log(`   File ${index + 1}: ${urlType}`);
                            console.log(`   URL: ${file.url}`);
                            console.log(`   Filename: ${file.filename}`);
                            console.log('');
                        });

                        // Check if any URLs are still relative
                        const relativeUrls = result.files.filter(f => !f.url.startsWith('http'));
                        const fullUrls = result.files.filter(f => f.url.startsWith('http'));

                        console.log('📈 Summary:');
                        console.log(`   ✅ Full URLs: ${fullUrls.length}`);
                        console.log(`   ❌ Relative URLs: ${relativeUrls.length}`);

                        if (relativeUrls.length > 0) {
                            console.log('');
                            console.log('⚠️  Some files still have relative URLs!');
                            console.log('💡 Run the migration: POST /api/upload/migrate-urls-to-full');
                        }
                    } else {
                        console.log('   📭 No files found in database');
                    }

                    resolve(result);
                } catch (err) {
                    console.log('❌ Failed to parse files response:', data);
                    reject(err);
                }
            });
        }).on('error', (err) => {
            console.log('❌ Files request failed:', err.message);
            reject(err);
        });
    });
}

// Test 3: Run URL migration
function runUrlMigration() {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/upload/migrate-urls-to-full`;
        console.log(`🔄 Running URL migration: ${url}`);

        const postData = '';
        const options = {
            hostname: new URL(url).hostname,
            path: new URL(url).pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ Migration result:', {
                        message: result.message,
                        updatedCount: result.updatedCount,
                        errorCount: result.errorCount,
                        totalProcessed: result.totalProcessed
                    });

                    if (result.errors && result.errors.length > 0) {
                        console.log('❌ Migration errors:');
                        result.errors.forEach(error => console.log(`   ${error}`));
                    }

                    resolve(result);
                } catch (err) {
                    console.log('❌ Failed to parse migration response:', data);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.log('❌ Migration request failed:', err.message);
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// Run all tests
async function runTests() {
    try {
        console.log('🚀 Starting database URL format tests...\n');

        await testUploadStatus();
        console.log('');

        await testFilesUrlFormat();
        console.log('');

        await runUrlMigration();
        console.log('');

        // Test again after migration
        console.log('🔄 Testing URL format after migration...\n');
        await testFilesUrlFormat();

        console.log('✅ All tests completed!');
        console.log('\n📝 Expected outcome:');
        console.log('   • All URLs should start with: https://cms.personalwings.site/uploads/');
        console.log('   • No relative URLs starting with just /uploads/');
        console.log('   • Database stores full URLs for immediate use');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

runTests();