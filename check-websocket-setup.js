#!/usr/bin/env node

/**
 * WebSocket Setup Checker
 * This script checks if WebSocket dependencies and configuration are properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking WebSocket Setup...\n');

let allGood = true;
const issues = [];
const suggestions = [];

// Check 1: Dependencies
console.log('📦 Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const requiredDeps = [
        '@nestjs/websockets',
        '@nestjs/platform-socket.io',
        'socket.io'
    ];

    const missingDeps = requiredDeps.filter(dep => !deps[dep]);

    if (missingDeps.length > 0) {
        allGood = false;
        issues.push(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
        suggestions.push(`Run: npm install ${missingDeps.join(' ')}`);
    } else {
        console.log('✅ All required dependencies installed');
    }
} catch (error) {
    console.log('⚠️  Could not read package.json');
}

// Check 2: ChatGateway file
console.log('\n📄 Checking ChatGateway file...');
const gatewayPath = path.join(__dirname, 'src', 'chat', 'chat.gateway.ts');
if (fs.existsSync(gatewayPath)) {
    console.log('✅ chat.gateway.ts exists');

    // Check if it has the decorator
    const gatewayContent = fs.readFileSync(gatewayPath, 'utf8');
    if (gatewayContent.includes('@WebSocketGateway')) {
        console.log('✅ @WebSocketGateway decorator found');
    } else {
        allGood = false;
        issues.push('❌ chat.gateway.ts missing @WebSocketGateway decorator');
    }

    if (gatewayContent.includes('handleMessage') || gatewayContent.includes('sendMessage')) {
        console.log('✅ Message handlers found');
    } else {
        allGood = false;
        issues.push('❌ Message handlers not implemented in chat.gateway.ts');
    }
} else {
    allGood = false;
    issues.push('❌ chat.gateway.ts file not found');
    suggestions.push('The file has been created at: backend/src/chat/chat.gateway.ts');
}

// Check 3: Chat Module
console.log('\n📦 Checking ChatModule configuration...');
const modulePath = path.join(__dirname, 'src', 'chat', 'chat.module.ts');
if (fs.existsSync(modulePath)) {
    const moduleContent = fs.readFileSync(modulePath, 'utf8');

    if (moduleContent.includes('ChatGateway')) {
        console.log('✅ ChatGateway imported in chat.module.ts');

        if (moduleContent.includes('providers') && moduleContent.includes('ChatGateway')) {
            console.log('✅ ChatGateway added to providers');
        } else {
            allGood = false;
            issues.push('❌ ChatGateway not added to providers array');
            suggestions.push('Add ChatGateway to the providers array in chat.module.ts');
        }
    } else {
        allGood = false;
        issues.push('❌ ChatGateway not imported in chat.module.ts');
        suggestions.push('Import and add ChatGateway to chat.module.ts providers');
    }
} else {
    console.log('⚠️  chat.module.ts not found (might be in a different location)');
}

// Check 4: Environment variables (optional)
console.log('\n🔧 Checking environment configuration...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('FRONTEND_URL')) {
        console.log('✅ FRONTEND_URL configured in .env');
    } else {
        suggestions.push('💡 Consider adding FRONTEND_URL to .env for CORS');
    }
} else {
    console.log('ℹ️  No .env file found (optional)');
}

// Summary
console.log('\n' + '='.repeat(60));
if (allGood) {
    console.log('✅ ✅ ✅  WebSocket Setup Complete!');
    console.log('\n🚀 Next steps:');
    console.log('1. Restart your backend: npm run start:dev');
    console.log('2. Open your frontend and check browser console');
    console.log('3. Look for: "WebSocket connected" message');
} else {
    console.log('❌ WebSocket Setup Incomplete\n');
    console.log('Issues found:');
    issues.forEach(issue => console.log(`  ${issue}`));

    if (suggestions.length > 0) {
        console.log('\n💡 Suggestions:');
        suggestions.forEach(suggestion => console.log(`  ${suggestion}`));
    }

    console.log('\n📚 For detailed instructions, see:');
    console.log('  - backend/WEBSOCKET_QUICKSTART.md (Quick setup)');
    console.log('  - frontend/WEBSOCKET_SETUP.md (Complete guide)');
}
console.log('='.repeat(60) + '\n');

process.exit(allGood ? 0 : 1);
