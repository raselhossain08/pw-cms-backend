import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TestimonialsSeeder } from '../cms/home/testimonials/seeds/testimonials.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seeder = app.get(TestimonialsSeeder);
    await seeder.seed();
    console.log('✅ Testimonials seeding completed!');
  } catch (error) {
    console.error('❌ Testimonials seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
