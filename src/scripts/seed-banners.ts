import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BannerSeeder } from '../cms/home/banner/seeds/banner.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seeder = app.get(BannerSeeder);

  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'clear') {
      await seeder.clear();
      console.log('🗑️  Database cleared');
    } else {
      await seeder.seed();
      console.log('🌱 Database seeded');
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
