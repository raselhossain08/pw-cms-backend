#!/usr/bin/env node

const https = require('https');

/**
 * Test script to debug upload file issues in production
 * Usage: node test-upload-debug.js [filename]
 */

const BASE_URL = 'https://cms.personalwings.site';
const filename = process.argv[2] || '1763712102357-footer-logo.webp';

console.log(`🔍 Testing upload debug for: ${filename}`);
console.log(`🌐 Base URL: ${BASE_URL}`);
console.log('━'.repeat(50));

// Test 1: Check upload service status
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
                    console.log('✅ Upload status:', result);
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

// Test 2: Check if specific file exists
function testFileExists(filename) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/upload/check-file/${filename}`;
        console.log(`🔍 Testing file existence: ${url}`);

        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('📁 File check result:', result);
                    resolve(result);
                } catch (err) {
                    console.log('❌ Failed to parse file check response:', data);
                    reject(err);
                }
            });
        }).on('error', (err) => {
            console.log('❌ File check request failed:', err.message);
            reject(err);
        });
    });
}

// Test 3: Try to access the file directly
function testDirectAccess(filename) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/uploads/images/${filename}`;
        console.log(`🖼️  Testing direct access: ${url}`);

        https.get(url, (res) => {
            console.log(`📡 Status Code: ${res.statusCode}`);
            console.log(`📦 Headers:`, res.headers);

            if (res.statusCode === 200) {
                console.log('✅ File is accessible!');
            } else {
                console.log(`❌ File not accessible (${res.statusCode})`);
            }

            resolve({
                statusCode: res.statusCode,
                headers: res.headers
            });
        }).on('error', (err) => {
            console.log('❌ Direct access failed:', err.message);
            reject(err);
        });
    });
}

// Run all tests
async function runTests() {
    try {
        console.log('🚀 Starting upload debug tests...\n');

        await testUploadStatus();
        console.log('');

        await testFileExists(filename);
        console.log('');

        await testDirectAccess(filename);
        console.log('');

        console.log('✅ All tests completed!');
        console.log('\n📝 Next steps if file is not found:');
        console.log('1. Check if BASE_URL environment variable is set to: https://cms.personalwings.site');
        console.log('2. Restart your backend service after adding BASE_URL');
        console.log('3. Run migration: POST /api/upload/migrate-existing-files');
        console.log('4. Check file permissions on uploads directory');
        console.log('5. Verify Nginx configuration is proxying /uploads/ correctly');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

runTests();