import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseCategoriesController } from './course-categories.controller';
import { CourseCategoriesService } from './course-categories.service';
import {
  CourseCategory,
  CourseCategorySchema,
} from './entities/course-category.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseCategory.name, schema: CourseCategorySchema },
    ]),
  ],
  controllers: [CourseCategoriesController],
  providers: [CourseCategoriesService],
  exports: [CourseCategoriesService],
})
export class CourseCategoriesModule {}
