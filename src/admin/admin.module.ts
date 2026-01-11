import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { AdminInstructorsController } from './admin-instructors.controller';
import { AdminInstructorsService } from './admin-instructors.service';
import { User, UserSchema } from '../users/entities/user.entity';
import { Course, CourseSchema } from '../courses/entities/course.entity';
import { Order, OrderSchema } from '../orders/entities/order.entity';
import { Review, ReviewSchema } from '../reviews/entities/review.entity';
import {
  Enrollment,
  EnrollmentSchema,
} from '../enrollments/entities/enrollment.entity';
import { Quiz, QuizSchema } from '../quizzes/entities/quiz.entity';
import {
  LiveSession,
  LiveSessionSchema,
} from '../live-sessions/entities/live-session.entity';
import { Coupon, CouponSchema } from '../coupons/entities/coupon.entity';
import {
  Transaction,
  TransactionSchema,
} from '../payments/entities/transaction.entity';
import { Invoice, InvoiceSchema } from '../payments/entities/invoice.entity';
import { Payout, PayoutSchema } from '../payments/entities/payout.entity';
import { SecurityMiddleware } from '../shared/middleware/security.middleware';
import { IntegrationsModule } from '../integrations/integrations.module';
import {
  ActivityLog,
  ActivityLogSchema,
} from '../activity-logs/entities/activity-log.entity';
import {
  Assignment,
  AssignmentSchema,
} from '../certificates/entities/additional.entity';

@Module({
  imports: [
    IntegrationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: LiveSession.name, schema: LiveSessionSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payout.name, schema: PayoutSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Assignment.name, schema: AssignmentSchema },
    ]),
  ],
  controllers: [
    AdminController,
    AdminPaymentsController,
    AdminInstructorsController,
  ],
  providers: [
    AdminService,
    AdminPaymentsService,
    AdminInstructorsService,
    SecurityMiddleware,
  ],
  exports: [AdminService, AdminPaymentsService, AdminInstructorsService],
})
export class AdminModule {}
