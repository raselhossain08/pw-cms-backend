import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, CourseSchema } from './entities/course.entity';
import { Lesson, LessonSchema } from './entities/lesson.entity';
import {
  Enrollment,
  EnrollmentSchema,
} from '../enrollments/entities/enrollment.entity';
import { CourseAccessGuard } from './guards/course-access.guard';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  CourseModule as CourseModuleEntity,
  CourseModuleSchema,
} from '../course-modules/entities/course-module.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: CourseModuleEntity.name, schema: CourseModuleSchema },
    ]),
  ],
  controllers: [CoursesController],
  providers: [CoursesService, CourseAccessGuard],
  exports: [CoursesService, CourseAccessGuard],
})
export class CoursesModule {}
