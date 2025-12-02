import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { BlogSeeder } from '../seeds/blog.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(BlogSeeder);

  try {
    await seeder.seed();
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
