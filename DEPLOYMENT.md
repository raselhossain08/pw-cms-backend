# CMS Backend Deployment Guide

## Production Environment Setup

### 1. Environment Variables

Create a `.env` file in your production server with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://your-mongodb-connection-string

# Authentication
JWT_SECRET=your-super-secure-jwt-secret

# Application Environment
NODE_ENV=production
PORT=8000

# Base URL for file serving (IMPORTANT for upload URLs)
BASE_URL=https://cms.personalwings.site

# Frontend URL for CORS
FRONTEND_URL=https://personalwings.site

# Storage Configuration
STORAGE_LIMIT_GB=10

# Cache Configuration (in seconds)
CACHE_TTL=3600
CACHE_MAX_ITEMS=1000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Compression
COMPRESSION_LEVEL=6

# Performance Settings
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
```

### 2. File Upload Issues Fix

The 404 error for uploaded images was caused by:

1. **Hardcoded localhost URLs** - Fixed by using environment-based BASE_URL
2. **Missing production configuration** - Added BASE_URL environment variable
3. **Static file serving optimization** - Enhanced for production

### 3. Deployment Steps

#### Option A: PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Create PM2 ecosystem file
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'cms-backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
    },
  ],
};
```

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Option B: Docker

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY uploads ./uploads

EXPOSE 8000

CMD ["node", "dist/main.js"]
```

### 4. Nginx Configuration

Add this to your Nginx configuration:

```nginx
server {
    listen 80;
    server_name cms.personalwings.site;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name cms.personalwings.site;

    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Upload size limit
    client_max_body_size 10M;

    # API routes
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files (uploads)
    location /uploads/ {
        proxy_pass http://localhost:8000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Cache uploaded images for better performance
        proxy_cache_valid 200 7d;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API documentation
    location /api-docs {
        proxy_pass http://localhost:8000/api-docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. Security Checklist

- [ ] Set strong JWT_SECRET
- [ ] Configure MongoDB with authentication
- [ ] Use HTTPS (SSL/TLS certificates)
- [ ] Set up proper firewall rules
- [ ] Enable MongoDB connection encryption
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity

### 6. Performance Optimization

- [ ] Enable gzip compression (handled by Nest.js)
- [ ] Configure proper caching headers (implemented)
- [ ] Use CDN for static files (optional)
- [ ] Monitor memory usage and optimize
- [ ] Set up database indexing
- [ ] Configure connection pooling

### 7. Monitoring & Logs

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs cms-backend

# Restart application
pm2 restart cms-backend

# Reload with zero downtime
pm2 reload cms-backend
```

### 8. Troubleshooting

#### Upload Issues

1. **Check file permissions:**

   ```bash
   chmod -R 755 uploads/
   chown -R www-data:www-data uploads/
   ```

2. **Verify environment variables:**

   ```bash
   printenv | grep BASE_URL
   ```

3. **Test upload endpoint:**
   ```bash
   curl -X POST https://cms.personalwings.site/api/upload/image \
     -H "Content-Type: multipart/form-data" \
     -F "file=@test-image.jpg" \
     -F "folder=general"
   ```

#### Common Issues

- **404 on uploads**: Check BASE_URL environment variable
- **CORS errors**: Verify FRONTEND_URL in environment
- **Large file uploads**: Check Nginx client_max_body_size
- **Memory issues**: Monitor PM2 memory usage and restart if needed

### 9. Database Migration

If you need to migrate existing files:

```bash
# Call the migration endpoint
curl -X POST https://cms.personalwings.site/api/upload/migrate-existing-files
```

### 10. Health Checks

Set up health check endpoints monitoring:

- API Status: `https://cms.personalwings.site/api/upload/status`
- System Status: `https://cms.personalwings.site/api/system-status`

## Quick Fix for Current Issue

1. Add `BASE_URL=https://cms.personalwings.site` to your production `.env` file
2. Restart your application
3. Clear browser cache
4. Test image upload again

The images should now be accessible at the correct production URL instead of localhost.
