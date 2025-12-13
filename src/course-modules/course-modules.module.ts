import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseModulesService } from './course-modules.service';
import { CourseModulesController } from './course-modules.controller';
import {
  CourseModule,
  CourseModuleSchema,
} from './entities/course-module.entity';
import { Course, CourseSchema } from '../courses/entities/course.entity';
import { Lesson, LessonSchema } from '../courses/entities/lesson.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseModule.name, schema: CourseModuleSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
  ],
  controllers: [CourseModulesController],
  providers: [CourseModulesService],
  exports: [CourseModulesService],
})
export class CourseModulesModule {}
