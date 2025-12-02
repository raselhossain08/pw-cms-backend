/**
 * Footer Seeder Script
 *
 * This script seeds the initial footer data into the database
 * Run: npm run seed:footer (add this to package.json scripts)
 * Or: ts-node src/cms/footer/scripts/seed-footer.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { FooterService } from '../services/footer.service';
import { footerSeedData } from '../seeds/footer-seed.data';

async function seedFooter() {
  console.log('🌱 Starting footer seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const footerService = app.get(FooterService);

  try {
    // Check if active footer already exists
    const existingFooter = await footerService.findActive();

    if (existingFooter) {
      console.log('✅ Active footer already exists. Skipping seed.');
      console.log(`   Footer ID: ${(existingFooter as any)._id}`);
      await app.close();
      return;
    }

    // Create initial footer
    console.log('📝 Creating initial footer...');
    const footer = await footerService.create(footerSeedData as any);

    console.log('✅ Footer seeded successfully!');
    console.log(`   Footer ID: ${(footer as any)._id}`);
    console.log(`   Active: ${footer.isActive}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Start your backend: npm run dev');
    console.log(
      '   2. Access the footer API: GET http://localhost:5000/api/cms/footer/active',
    );
    console.log(
      '   3. Upload a logo (optional): POST http://localhost:5000/api/cms/footer/{id}/logo',
    );
    console.log(
      '   4. Your frontend will now fetch this footer data automatically!\n',
    );
  } catch (error) {
    console.error('❌ Error seeding footer:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the seeder
seedFooter()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
