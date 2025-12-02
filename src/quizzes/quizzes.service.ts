import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizQuestion } from './entities/quiz.entity';
import {
  QuizSubmission,
  SubmissionStatus,
  QuizAnswer,
} from './entities/quiz-submission.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(QuizSubmission.name)
    private submissionModel: Model<QuizSubmission>,
  ) {}

  async create(
    createQuizDto: CreateQuizDto,
    instructorId: string,
  ): Promise<Quiz> {
    const { questions, courseId, lessonId, ...quizData } = createQuizDto;

    // Calculate total points
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    // Add IDs to questions
    const questionsWithIds: QuizQuestion[] = questions.map((q, index) => ({
      ...q,
      id: new Types.ObjectId().toString(),
    }));

    const quiz = new this.quizModel({
      ...quizData,
      course: courseId,
      lesson: lessonId,
      instructor: instructorId,
      questions: questionsWithIds,
      totalPoints,
    });

    return await quiz.save();
  }

  async findAll(query: {
    courseId?: string;
    lessonId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ quizzes: Quiz[]; total: number }> {
    const { courseId, lessonId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };
    if (courseId) filter.course = courseId;
    if (lessonId) filter.lesson = lessonId;

    const [quizzes, total] = await Promise.all([
      this.quizModel
        .find(filter)
        .populate('course', 'title')
        .populate('instructor', 'firstName lastName')
        .select('-questions.correctAnswer -questions.explanation')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.quizModel.countDocuments(filter),
    ]);

    return { quizzes, total };
  }

  async findOne(id: string, userId?: string): Promise<Quiz> {
    const quiz = await this.quizModel
      .findById(id)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName');

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Hide correct answers unless user is instructor
    if (userId && quiz.instructor.toString() !== userId) {
      quiz.questions = quiz.questions.map((q) => {
        const { correctAnswer, explanation, ...question } = q;
        return question as any;
      });
    }

    return quiz;
  }

  async update(
    id: string,
    updateQuizDto: UpdateQuizDto,
    instructorId: string,
  ): Promise<Quiz> {
    const quiz = await this.quizModel.findById(id);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    if (updateQuizDto.questions) {
      const totalPoints = updateQuizDto.questions.reduce(
        (sum, q) => sum + q.points,
        0,
      );
      quiz.totalPoints = totalPoints;
      quiz.questions = updateQuizDto.questions.map((q) => ({
        ...q,
        id: q['id'] || new Types.ObjectId().toString(),
      })) as QuizQuestion[];
    }

    Object.assign(quiz, updateQuizDto);
    return await quiz.save();
  }

  async remove(id: string, instructorId: string): Promise<void> {
    const quiz = await this.quizModel.findById(id);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only delete your own quizzes');
    }

    quiz.isActive = false;
    await quiz.save();
  }

  async startQuiz(quizId: string, userId: string): Promise<QuizSubmission> {
    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check if quiz is available
    const now = new Date();
    if (quiz.availableFrom && quiz.availableFrom > now) {
      throw new BadRequestException('Quiz not yet available');
    }
    if (quiz.availableUntil && quiz.availableUntil < now) {
      throw new BadRequestException('Quiz no longer available');
    }

    // Check previous attempts
    const previousAttempts = await this.submissionModel.countDocuments({
      quiz: quizId,
      student: userId,
      status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] },
    });

    if (quiz.attemptsAllowed > 0 && previousAttempts >= quiz.attemptsAllowed) {
      throw new BadRequestException('Maximum attempts reached');
    }

    // Check for in-progress submission
    const inProgress = await this.submissionModel.findOne({
      quiz: quizId,
      student: userId,
      status: SubmissionStatus.IN_PROGRESS,
    });

    if (inProgress) {
      return inProgress;
    }

    const submission = new this.submissionModel({
      quiz: quizId,
      student: userId,
      startedAt: new Date(),
      attemptNumber: previousAttempts + 1,
    });

    return await submission.save();
  }

  async submitQuiz(
    quizId: string,
    submissionId: string,
    submitQuizDto: SubmitQuizDto,
    userId: string,
  ): Promise<QuizSubmission> {
    const [quiz, submission] = await Promise.all([
      this.quizModel.findById(quizId),
      this.submissionModel.findById(submissionId),
    ]);

    if (!quiz || !submission) {
      throw new NotFoundException('Quiz or submission not found');
    }

    if (submission.student.toString() !== userId) {
      throw new ForbiddenException('Not your submission');
    }

    if (submission.status !== SubmissionStatus.IN_PROGRESS) {
      throw new BadRequestException('Submission already submitted');
    }

    // Grade the quiz
    const gradedAnswers: QuizAnswer[] = submitQuizDto.answers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId);

      if (!question) {
        return { ...answer, isCorrect: false, pointsEarned: 0 };
      }

      const isCorrect = this.checkAnswer(answer.answer, question.correctAnswer);
      const pointsEarned = isCorrect ? question.points : 0;

      return {
        ...answer,
        isCorrect,
        pointsEarned,
      };
    });

    const score = gradedAnswers.reduce(
      (sum, a) => sum + (a.pointsEarned || 0),
      0,
    );
    const percentage = (score / quiz.totalPoints) * 100;
    const passed = percentage >= quiz.passingScore;

    submission.answers = gradedAnswers;
    submission.score = score;
    submission.percentage = Math.round(percentage * 100) / 100;
    submission.passed = passed;
    submission.status = SubmissionStatus.GRADED;
    submission.submittedAt = new Date();
    submission.gradedAt = new Date();
    submission.timeSpent = submitQuizDto.timeSpent;

    return await submission.save();
  }

  private checkAnswer(
    userAnswer: string | string[],
    correctAnswer: any,
  ): boolean {
    if (Array.isArray(correctAnswer)) {
      if (!Array.isArray(userAnswer)) return false;
      return correctAnswer.sort().join(',') === userAnswer.sort().join(',');
    }

    if (Array.isArray(userAnswer)) {
      return userAnswer.length === 1 && userAnswer[0] === correctAnswer;
    }

    return (
      String(userAnswer).toLowerCase().trim() ===
      String(correctAnswer).toLowerCase().trim()
    );
  }

  async getSubmission(
    submissionId: string,
    userId: string,
  ): Promise<QuizSubmission> {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate('quiz')
      .populate('student', 'firstName lastName');

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.student['_id'].toString() !== userId) {
      throw new ForbiddenException('Not your submission');
    }

    return submission;
  }

  async getUserSubmissions(
    userId: string,
    quizId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ submissions: QuizSubmission[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: any = { student: userId };
    if (quizId) filter.quiz = quizId;

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find(filter)
        .populate('quiz', 'title totalPoints passingScore')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.submissionModel.countDocuments(filter),
    ]);

    return { submissions, total };
  }

  async getQuizSubmissions(
    quizId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ submissions: QuizSubmission[]; total: number; stats: any }> {
    const skip = (page - 1) * limit;

    const [submissions, total, stats] = await Promise.all([
      this.submissionModel
        .find({
          quiz: quizId,
          status: {
            $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED],
          },
        })
        .populate('student', 'firstName lastName email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.submissionModel.countDocuments({
        quiz: quizId,
        status: { $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED] },
      }),
      this.getQuizStats(quizId),
    ]);

    return { submissions, total, stats };
  }

  async getQuizStats(quizId: string): Promise<any> {
    const stats = await this.submissionModel.aggregate([
      {
        $match: {
          quiz: new Types.ObjectId(quizId),
          status: {
            $in: [SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          passedCount: { $sum: { $cond: ['$passed', 1, 0] } },
          failedCount: { $sum: { $cond: ['$passed', 0, 1] } },
          averageTime: { $avg: '$timeSpent' },
        },
      },
    ]);

    return (
      stats[0] || {
        totalAttempts: 0,
        averageScore: 0,
        passedCount: 0,
        failedCount: 0,
        averageTime: 0,
      }
    );
  }
}
