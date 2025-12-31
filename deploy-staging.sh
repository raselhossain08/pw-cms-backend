#!/bin/bash

echo "🚀 Deploying Personal Wings Backend to Staging Environment..."

# Load environment variables
export $(grep -v '^#' .env.staging | xargs)

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin staging || git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Run database migrations (if any)
echo "🗄️ Running database migrations..."
npm run seed:staging || echo "No staging seed script found"

# Restart PM2 process for staging
echo "🔄 Restarting PM2 process for staging..."
pm2 restart personal-wings-staging || pm2 start dist/src/main.js --name personal-wings-staging --env staging

# Show deployment status
echo "📋 Deployment status:"
pm2 list | grep personal-wings-staging

echo "✅ Staging deployment complete!"
echo "🌐 Staging URL: http://staging.yourdomain.com:${PORT}"
echo "📊 Health check: http://staging.yourdomain.com:${PORT}/api/health"