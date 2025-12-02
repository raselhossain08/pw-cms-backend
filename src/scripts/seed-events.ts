import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { EventsSeeder } from '../cms/home/events/seeds/events.seed';

async function seedEvents() {
  const logger = new Logger('EventsSeed');
  const app = await NestFactory.create(AppModule);

  try {
    const eventsSeeder = app.get(EventsSeeder);
    await eventsSeeder.seed();
    logger.log('🎉 Events seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Events seeding failed:', error);
  } finally {
    await app.close();
  }
}

seedEvents();
