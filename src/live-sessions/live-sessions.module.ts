import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSession, LiveSessionSchema } from './entities/live-session.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveSession.name, schema: LiveSessionSchema },
    ]),
  ],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService],
  exports: [LiveSessionsService, MongooseModule],
})
export class LiveSessionsModule {}
