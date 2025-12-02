import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsEvent,
  AnalyticsEventSchema,
} from './entities/analytics.entity';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsEvent.name, schema: AnalyticsEventSchema },
    ]),
    CoursesModule,
    UsersModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
