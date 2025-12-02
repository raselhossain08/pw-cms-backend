import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AboutSectionSeeder } from '../cms/home/about-section/seeds/about-section.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(AboutSectionSeeder);

  console.log('Starting About Section seed...');
  await seeder.seed();
  console.log('About Section seed completed!');

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
