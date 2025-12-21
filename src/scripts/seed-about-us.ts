import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AboutUsSeeder } from '../cms/about-us/seeds/about-us.seed';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const seeder = app.get(AboutUsSeeder);
        await seeder.seed();
        console.log('About Us seeding completed successfully');
    } catch (error) {
        console.error('Error seeding About Us:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap();
