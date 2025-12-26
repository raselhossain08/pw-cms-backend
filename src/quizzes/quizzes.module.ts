import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { Quiz, QuizSchema } from './entities/quiz.entity';
import {
  QuizSubmission,
  QuizSubmissionSchema,
} from './entities/quiz-submission.entity';
import { Lesson, LessonSchema } from '../courses/entities/lesson.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizSubmission.name, schema: QuizSubmissionSchema },
      { name: Lesson.name, schema: LessonSchema },
    ]),
  ],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService, MongooseModule],
})
export class QuizzesModule {}
