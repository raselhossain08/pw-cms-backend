/**
 * Terms & Conditions Seeder Script
 *
 * This script seeds the initial terms & conditions data into the database
 * Run: npm run seed:terms-conditions
 * Or: ts-node -r tsconfig-paths/register src/cms/terms-conditions/scripts/seed-terms-conditions.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { TermsConditionsService } from '../terms-conditions.service';

async function seedTermsConditions() {
  console.log('🌱 Starting Terms & Conditions seeding...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const termsConditionsService = app.get(TermsConditionsService);

  try {
    // Check if active terms & conditions already exists
    const existingTerms = await termsConditionsService.findActive();

    if (existingTerms) {
      console.log('✅ Active Terms & Conditions already exists. Skipping seed.');
      console.log(`   Terms ID: ${(existingTerms as any)._id}`);
      console.log(`   Last Updated: ${existingTerms.lastUpdated}`);
      console.log(`   Active: ${existingTerms.isActive}`);

      // Check if it has acceptanceSection, if not, update it
      if (!existingTerms.acceptanceSection) {
        console.log('⚠️  Existing terms missing acceptanceSection. Updating...');
        await termsConditionsService.update((existingTerms as any)._id, {
          acceptanceSection: {
            title: 'Acceptance of Terms',
            content:
              'By using Personal Wings, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must discontinue use of our services immediately.',
            isActive: true,
          },
        });
        console.log('✅ Updated existing terms with acceptanceSection');
      }

      await app.close();
      return;
    }

    // Create default terms & conditions (this will create with all default data including acceptanceSection)
    console.log('📝 Creating default Terms & Conditions...');
    const termsConditions = await termsConditionsService.getOrCreateDefault();

    console.log('✅ Terms & Conditions seeded successfully!');
    console.log(`   Terms ID: ${(termsConditions as any)._id}`);
    console.log(`   Last Updated: ${termsConditions.lastUpdated}`);
    console.log(`   Active: ${termsConditions.isActive}`);
    console.log(`   Sections: ${termsConditions.sections?.length || 0}`);
    console.log(`   Has Acceptance Section: ${!!termsConditions.acceptanceSection}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Start your backend: npm run start:dev');
    console.log(
      '   2. Access the terms API: GET http://localhost:5000/api/cms/terms-conditions/default',
    );
    console.log(
      '   3. Edit via CMS dashboard: Navigate to CMS > Terms & Conditions',
    );
    console.log(
      '   4. Your frontend will now fetch this terms data automatically!\n',
    );
  } catch (error) {
    console.error('❌ Error seeding Terms & Conditions:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the seeder
seedTermsConditions()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
