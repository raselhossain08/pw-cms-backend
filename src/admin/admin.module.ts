import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: LiveSession.name, schema: LiveSessionSchema },
      { name: Coupon.name, schema: CouponSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
