# MongoDB Atlas Migration Guide

This guide will help you migrate your existing local MongoDB data to MongoDB Atlas.

## Overview

Your application is now configured to connect to MongoDB Atlas using this connection string:

```
mongodb+srv://personal_wings:AsNaRe2mqhD5292v@cluster0.ho9audm.mongodb.net/personal-wings-cms
```

## Migration Steps

### Step 1: Stop Your Application

First, stop your running application to prevent data changes during migration:

```powershell
# Stop the dev server if it's running
# Press Ctrl+C in the terminal running the application
```

### Step 2: Create a Backup (Recommended)

Before migrating, create a backup of your current local data:

```powershell
npm run backup:restore backup
```

This will create a backup file in the `migration-backup/` directory.

### Step 3: Run Migration

Execute the migration script to move your data to Atlas:

```powershell
npm run migrate:atlas
```

This script will:

- Connect to your local MongoDB
- Connect to MongoDB Atlas
- Export all data from local collections (headers, footers, uploadedFiles)
- Import the data to Atlas
- Provide a detailed migration report

### Step 4: Start Your Application

Once migration is complete, start your application:

```powershell
npm run start:dev
```

Your application will now be connected to MongoDB Atlas.

## Available Commands

### Migration Commands

- `npm run migrate:atlas` - Migrate data from local MongoDB to Atlas
- `npm run migrate:files` - Migrate existing uploaded files to database records

### Backup & Restore Commands

- `npm run backup:restore backup` - Create a backup of current database
- `npm run backup:restore restore <file>` - Restore from a backup file
- `npm run backup:restore list` - List available backup files

### Seeding Commands

- `npm run seed` - Seed the database with default data (if empty)

## Examples

### Creating backups from different sources

```powershell
# Backup from local MongoDB
npm run backup:restore backup "mongodb://localhost:27017/cms_db"

# Backup from Atlas
npm run backup:restore backup "mongodb+srv://personal_wings:AsNaRe2mqhD5292v@cluster0.ho9audm.mongodb.net/personal-wings-cms"
```

### Restoring from backup

```powershell
# List available backups
npm run backup:restore list

# Restore a specific backup
npm run backup:restore restore "migration-backup/backup-2024-11-21T10-30-00-000Z.json"
```

## Troubleshooting

### If Migration Fails

1. Check your internet connection
2. Verify the Atlas connection string is correct
3. Ensure your local MongoDB is running
4. Check the error messages in the console

### If You Need to Rollback

1. Update your `.env` file to use local MongoDB:
   ```
   MONGODB_URI=mongodb://localhost:27017/cms_db
   ```
2. Restore from backup if needed:
   ```powershell
   npm run backup:restore restore <backup-file>
   ```

### Connection Issues

- Ensure your IP is whitelisted in MongoDB Atlas
- Check if your firewall allows outbound connections on port 27017
- Verify your Atlas cluster is running

## Data Collections

The migration includes these collections:

- **Headers**: Website header configuration and navigation data
- **Footers**: Website footer content and links
- **Uploaded Files**: File metadata and paths for uploaded content

## File Storage

Note: This migration only moves database records. Your uploaded files in the `uploads/` directory will remain on your local server. For production deployment, consider:

- Moving files to cloud storage (AWS S3, Azure Blob, etc.)
- Updating file URLs in the database
- Setting up a CDN for better performance

## Security Notes

- Keep your MongoDB Atlas credentials secure
- Consider rotating the password after setup
- Enable IP whitelist restrictions in Atlas
- Set up database access controls for production

## Need Help?

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify your network connectivity
3. Ensure MongoDB Atlas cluster is properly configured
4. Review the backup files in `migration-backup/` directory
