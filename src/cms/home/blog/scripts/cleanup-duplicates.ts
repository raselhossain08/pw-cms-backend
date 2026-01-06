import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { BlogService } from '../services/blog.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';

/**
 * Cleanup Duplicate Blog Documents Script
 *
 * This script will:
 * 1. Check how many blog documents exist
 * 2. Keep only the FIRST (oldest) blog document
 * 3. Delete all other duplicate documents
 *
 * Run with: npx ts-node src/cms/home/blog/scripts/cleanup-duplicates.ts
 */

async function bootstrap() {
  console.log('🔍 Starting blog documents cleanup...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the blog model directly
    const blogModel = app.get<Model<BlogDocument>>('BlogModel');

    // Find all blog documents
    const allBlogs = await blogModel.find().sort({ createdAt: 1 }).exec();

    console.log(`📊 Found ${allBlogs.length} blog document(s) in database\n`);

    if (allBlogs.length === 0) {
      console.log('✅ No blog documents found. Database is clean!');
      console.log('💡 You can run the seed script to create initial data.');
    } else if (allBlogs.length === 1) {
      console.log('✅ Only ONE blog document found. This is correct!');
      console.log('\n📝 Blog Document Details:');
      console.log(`   - ID: ${allBlogs[0]._id}`);
      console.log(`   - Title: ${allBlogs[0].title}`);
      console.log(`   - Number of Posts: ${allBlogs[0].blogs?.length || 0}`);
      console.log(`   - Is Active: ${allBlogs[0].isActive}`);
      console.log(`   - Created At: ${(allBlogs[0] as any).createdAt}`);
    } else {
      console.log(`⚠️  MULTIPLE blog documents found! This causes issues.`);
      console.log('📝 All documents:\n');

      allBlogs.forEach((blog, index) => {
        console.log(`   ${index + 1}. ID: ${blog._id}`);
        console.log(`      - Title: ${blog.title}`);
        console.log(`      - Posts: ${blog.blogs?.length || 0}`);
        console.log(`      - Active: ${blog.isActive}`);
        console.log(`      - Created: ${(blog as any).createdAt}`);
        console.log('');
      });

      // Keep the first (oldest) document
      const keepDocument = allBlogs[0];
      const deleteDocuments = allBlogs.slice(1);

      console.log(`\n🎯 Will KEEP document ID: ${keepDocument._id} (oldest)`);
      console.log(`   - Title: ${keepDocument.title}`);
      console.log(`   - Posts: ${keepDocument.blogs?.length || 0}`);
      console.log(`   - Created: ${(keepDocument as any).createdAt}\n`);

      console.log(
        `🗑️  Will DELETE ${deleteDocuments.length} duplicate document(s):\n`,
      );
      deleteDocuments.forEach((doc, index) => {
        console.log(
          `   ${index + 1}. ID: ${doc._id} (Created: ${(doc as any).createdAt})`,
        );
      });

      console.log('\n⚙️  Performing cleanup...');

      // Delete all duplicates
      const idsToDelete = deleteDocuments.map((doc) => doc._id);
      const deleteResult = await blogModel
        .deleteMany({
          _id: { $in: idsToDelete },
        })
        .exec();

      console.log(
        `✅ Deleted ${deleteResult.deletedCount} duplicate document(s)\n`,
      );

      // Verify cleanup
      const remainingBlogs = await blogModel.countDocuments().exec();
      console.log(`📊 Remaining blog documents: ${remainingBlogs}`);

      if (remainingBlogs === 1) {
        console.log('✅ SUCCESS! Database now has exactly ONE blog document.');
        console.log('🎉 Your blog posts should now persist correctly!');
      } else {
        console.log(
          '⚠️  Warning: Expected 1 document but found ' + remainingBlogs,
        );
      }
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await app.close();
    console.log('\n✨ Cleanup script finished.');
  }
}

bootstrap();
