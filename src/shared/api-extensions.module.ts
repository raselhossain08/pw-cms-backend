import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BulkOperationsController } from './controllers/bulk-operations.controller';
import { ReportsController } from './controllers/reports.controller';
import { ProgressController } from './controllers/progress.controller';
import { InstructorController } from './controllers/instructor.controller';
import { LMSConnectionsController } from './controllers/lms-connections.controller';
import { LMSConnectionsService } from './services/lms-connections.service';
import { Course, CourseSchema } from '../courses/entities/course.entity';
import { Lesson, LessonSchema } from '../courses/entities/lesson.entity';
import { User, UserSchema } from '../users/entities/user.entity';
import { Order, OrderSchema } from '../orders/entities/order.entity';
import {
  Enrollment,
  EnrollmentSchema,
} from '../enrollments/entities/enrollment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
    ]),
  ],
  controllers: [
    BulkOperationsController,
    ReportsController,
    ProgressController,
    InstructorController,
    LMSConnectionsController,
  ],
  providers: [LMSConnectionsService],
  exports: [LMSConnectionsService],
})
export class ApiExtensionsModule {}
