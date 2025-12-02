import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PageTrackingService } from './page-tracking.service';
import { PageTrackingController } from './page-tracking.controller';
import {
  PageView,
  PageViewSchema,
  UserSession,
  UserSessionSchema,
  UserEvent,
  UserEventSchema,
  Heatmap,
  HeatmapSchema,
} from './entities/page-tracking.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageView.name, schema: PageViewSchema },
      { name: UserSession.name, schema: UserSessionSchema },
      { name: UserEvent.name, schema: UserEventSchema },
      { name: Heatmap.name, schema: HeatmapSchema },
    ]),
  ],
  controllers: [PageTrackingController],
  providers: [PageTrackingService],
  exports: [PageTrackingService],
})
export class PageTrackingModule {}
