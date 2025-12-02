/**
 * Routes Diagnostic Script
 *
 * This script checks if Footer CMS routes are properly registered
 * Run: npm run check:routes
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';

async function checkRoutes() {
  console.log('🔍 Checking Footer CMS routes...\n');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const server = app.getHttpServer();
  const router = server._events.request._router;

  console.log('📋 Registered Routes:\n');

  if (router && router.stack) {
    const footerRoutes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods).join(', ').toUpperCase(),
      }))
      .filter((route: any) => route.path.includes('footer'));

    if (footerRoutes.length > 0) {
      footerRoutes.forEach((route: any) => {
        console.log(`✅ ${route.methods.padEnd(7)} ${route.path}`);
      });
      console.log(`\n✨ Found ${footerRoutes.length} footer routes!`);
    } else {
      console.log('❌ No footer routes found!');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check if FooterModule is imported in CmsModule');
      console.log('   2. Check if CmsModule is imported in AppModule');
      console.log('   3. Check if FooterController has @Controller decorator');
      console.log('   4. Restart the development server');
    }
  }

  await app.close();
}

checkRoutes()
  .then(() => {
    console.log('\n✅ Route check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error checking routes:', error.message);
    process.exit(1);
  });
