import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import {
  Assignment,
  AssignmentSchema,
  AssignmentSubmission,
  AssignmentSubmissionSchema,
} from '../certificates/entities/additional.entity';
import { Lesson, LessonSchema } from '../courses/entities/lesson.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Assignment.name, schema: AssignmentSchema },
      { name: AssignmentSubmission.name, schema: AssignmentSubmissionSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule { }
