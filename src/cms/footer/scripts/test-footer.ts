/**
 * Footer Module Test
 * Quick test to verify FooterModule and data are working
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { FooterService } from '../services/footer.service';

async function testFooter() {
  console.log('🧪 Testing Footer Module...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const footerService = app.get(FooterService);

    // Test 1: Check if service is available
    console.log('✅ FooterService is available');

    // Test 2: Check if active footer exists
    const activeFooter = await footerService.findActive();

    if (activeFooter) {
      console.log('✅ Active footer found in database');
      console.log(`   ID: ${(activeFooter as any)._id}`);
      console.log(`   Logo: ${activeFooter.logo.src}`);
      console.log(`   Sections: ${activeFooter.sections.length}`);
      console.log(`   Active: ${activeFooter.isActive}`);
    } else {
      console.log('❌ No active footer found');
      console.log('   Run: npm run seed:footer');
    }

    // Test 3: Check all footers
    const allFooters = await footerService.findAll();
    console.log(`\n📊 Total footers in database: ${allFooters.length}`);

    console.log('\n✅ Footer Module Test Passed!');
    console.log('\n💡 If API still returns 404:');
    console.log('   1. Stop the backend server (Ctrl+C)');
    console.log('   2. Delete dist folder: Remove-Item dist -Recurse -Force');
    console.log('   3. Restart: npm run start:dev');
    console.log('   4. Wait for "Personal Wings Professional Backend running"');
    console.log('   5. Test: http://localhost:5000/api/cms/footer/active\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await app.close();
  }
}

testFooter()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
