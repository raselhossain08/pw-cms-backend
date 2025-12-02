import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Events, EventsSchema } from './schemas/events.schema';
import { EventsService } from './services/events.service';
import { EventsController } from './controllers/events.controller';
import { CloudinaryService } from '../../services/cloudinary.service';
import { EventsSeeder } from './seeds/events.seed';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Events.name, schema: EventsSchema }]),
  ],
  controllers: [EventsController],
  providers: [EventsService, CloudinaryService, EventsSeeder],
  exports: [EventsService, EventsSeeder],
})
export class EventsModule {}
