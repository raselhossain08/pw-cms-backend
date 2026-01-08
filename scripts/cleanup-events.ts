import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Events } from '../src/cms/home/events/schemas/events.schema';

async function cleanupEvents() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const eventsModel = app.get(getModelToken(Events.name));

        console.log('🔍 Checking existing Events document...');
        const existing = await eventsModel.findOne().lean();

        if (existing) {
            console.log('📋 Current document:', JSON.stringify(existing, null, 2));
            console.log('\n🗑️  Deleting old Events document...');
            await eventsModel.deleteMany({});
            console.log('✅ Old document deleted successfully!');
        } else {
            console.log('ℹ️  No existing Events document found.');
        }

        console.log('\n✨ Creating fresh Events document...');
        const newEvents = new eventsModel({
            title: 'Upcoming Events',
            subtitle: 'Join our aviation community',
            events: [],
            seo: {
                title: 'Events',
                description: 'Join our upcoming aviation events and training sessions',
                keywords: 'aviation events, pilot training, aviation community',
                ogImage: '',
            },
        });
        await newEvents.save();
        console.log('✅ Fresh Events document created!');

        const result = await eventsModel.findOne().lean();
        console.log('\n📊 New document:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await app.close();
    }
}

cleanupEvents();
