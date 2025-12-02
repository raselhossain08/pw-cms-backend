#!/bin/bash

echo "🚀 Deploying pw-cms-backend..."

# Pull latest changes
echo "📥 Pulling latest code from GitHub..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Restart PM2
echo "🔄 Restarting PM2 process..."
pm2 restart cms-backend

# Show logs
echo "📋 Showing recent logs..."
pm2 logs cms-backend --lines 30 --nostream

echo "✅ Deployment complete!"
