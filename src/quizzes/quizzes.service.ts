import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Quiz, QuizQuestion } from './entities/quiz.entity';
import {
  QuizSubmission,
  SubmissionStatus,
  QuizAnswer,
} from './entities/quiz-submission.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Lesson } from '../courses/entities/lesson.entity';

export interface QuizStats {
  totalAttempts: number;
  averageScore: number;
  passedCount: number;
  failedCount: number;
  averageTime: number;
  completionRate: number;
}

type QuizDuplicationData = Omit<Quiz, '_id' | 'createdAt' | 'updatedAt'> & {
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class QuizzesService {
  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(QuizSubmission.name)
    private submissionModel: Model<QuizSubmission>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
  ) {}

  async create(
    createQuizDto: CreateQuizDto,
    instructorId: string,
  ): Promise<Quiz> {
    const { questions, courseId, lessonId, moduleId, ...quizData } =
      createQuizDto;

    // Calculate total points
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    // Add IDs to questions
    const questionsWithIds: QuizQuestion[] = questions.map((q, _) => ({
      ...q,
      id: new Types.ObjectId().toString(),
    }));

    const quiz = new this.quizModel({
      ...quizData,
      course: courseId,
      lesson: lessonId,
      module: moduleId ? new Types.ObjectId(moduleId) : undefined,
      instructor: instructorId,
      questions: questionsWithIds,
      totalPoints,
    });

    const savedQuiz = await quiz.save();

    // Automatically create a lesson of type QUIZ if moduleId is provided
    if (moduleId) {
      // Generate slug from quiz title
      const slug = createQuizDto.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      // Check for existing lesson with same slug
      let finalSlug = slug;
      const existingLesson = await this.lessonModel.findOne({
        course: courseId,
        slug: finalSlug,
      });
      if (existingLesson) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      // Get the order for the new lesson within the module
      const lessonCount = await this.lessonModel.countDocuments({
        course: courseId,
        module: new Types.ObjectId(moduleId),
      });

      // Create the lesson
      const lesson = new this.lessonModel({
        title: createQuizDto.title,
        slug: finalSlug,
        description: createQuizDto.description || '',
        type: 'quiz',
        status: 'published',
        order: lessonCount + 1,
        course: new Types.ObjectId(courseId),
        module: new Types.ObjectId(moduleId),
        duration: createQuizDto.duration || 0,
        passingScore: createQuizDto.passingScore || 70,
        isFree: false,
      });

      await lesson.save();

      // Update the quiz with the lesson reference
      savedQuiz.lesson = lesson._id as Types.ObjectId;
      await savedQuiz.save();
    }

    return savedQuiz;
  }

  async findAll(query: {
    courseId?: string;
    lessonId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ quizzes: Quiz[]; total: number }> {
    const { courseId, lessonId, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<Quiz> = { isActive: true };
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
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const {
          correctAnswer: _correctAnswer,
          explanation: _explanation,
          ...question
        } = q;
        /* eslint-enable @typescript-eslint/no-unused-vars */
        return question as Omit<QuizQuestion, 'correctAnswer' | 'explanation'>;
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
        id: (q as QuizQuestion).id || new Types.ObjectId().toString(),
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

      const isCorrect = this.checkAnswer(
        answer.answer ?? '',
        question.correctAnswer ?? '',
      );
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
    correctAnswer: string | string[],
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

    if (
      (submission.student as { _id: Types.ObjectId })._id.toString() !== userId
    ) {
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
    const filter: FilterQuery<QuizSubmission> = { student: userId };
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
  ): Promise<{
    submissions: QuizSubmission[];
    total: number;
    stats: QuizStats;
  }> {
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

  async getQuizStats(quizId: string): Promise<QuizStats> {
    const stats = await this.submissionModel.aggregate<QuizStats>([
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

    const stat = stats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      passedCount: 0,
      failedCount: 0,
      averageTime: 0,
    };

    // Calculate completion rate (passed attempts / total attempts * 100)
    const completionRate =
      stat.totalAttempts > 0
        ? (stat.passedCount / stat.totalAttempts) * 100
        : 0;

    return {
      ...stat,
      completionRate,
    };
  }

  async toggleStatus(id: string, instructorId: string): Promise<Quiz> {
    const quiz = await this.quizModel.findById(id);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only update your own quizzes');
    }

    quiz.isActive = !quiz.isActive;
    return await quiz.save();
  }

  async duplicate(id: string, instructorId: string): Promise<Quiz> {
    const originalQuiz = await this.quizModel.findById(id);

    if (!originalQuiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (originalQuiz.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only duplicate your own quizzes');
    }

    const duplicatedData: any = originalQuiz.toObject();
    delete duplicatedData._id;
    delete duplicatedData.createdAt;
    delete duplicatedData.updatedAt;

    duplicatedData.title = `${originalQuiz.title} (Copy)`;
    duplicatedData.isActive = false;

    // Generate new IDs for questions
    duplicatedData.questions = duplicatedData.questions.map(
      (q: QuizQuestion) => ({
        ...q,
        id: new Types.ObjectId().toString(),
      }),
    );

    const duplicatedQuiz = new this.quizModel(duplicatedData);
    return await duplicatedQuiz.save();
  }

  async bulkDelete(
    ids: string[],
    instructorId: string,
  ): Promise<{ deleted: number }> {
    const quizzes = await this.quizModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      instructor: instructorId,
    });

    if (quizzes.length === 0) {
      throw new NotFoundException('No quizzes found to delete');
    }

    await this.quizModel.updateMany(
      { _id: { $in: quizzes.map((q) => q._id) } },
      { isActive: false },
    );

    return { deleted: quizzes.length };
  }

  async bulkToggleStatus(
    ids: string[],
    instructorId: string,
  ): Promise<{ updated: number }> {
    const quizzes = await this.quizModel.find({
      _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
      instructor: instructorId,
    });

    if (quizzes.length === 0) {
      throw new NotFoundException('No quizzes found to update');
    }

    await this.quizModel.updateMany(
      { _id: { $in: quizzes.map((q) => q._id) } },
      [{ $set: { isActive: { $not: '$isActive' } } }],
    );

    return { updated: quizzes.length };
  }

  async exportQuizzes(
    format: 'csv' | 'xlsx' | 'pdf',
    options: { courseId?: string; userId?: string },
  ): Promise<any> {
    const filter: FilterQuery<Quiz> = {};

    if (options.courseId) {
      filter.course = new Types.ObjectId(options.courseId);
    }

    if (options.userId) {
      filter.instructor = new Types.ObjectId(options.userId);
    }

    const quizzes = await this.quizModel
      .find(filter)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName email')
      .lean();

    if (format === 'csv') {
      return this.exportToCSV(quizzes);
    } else if (format === 'xlsx') {
      return this.exportToExcel(quizzes);
    } else if (format === 'pdf') {
      return this.exportToPDF(quizzes);
    }
  }

  private exportToCSV(quizzes: any[]): string {
    const headers = [
      'Title',
      'Description',
      'Course',
      'Instructor',
      'Questions',
      'Duration (min)',
      'Passing Score (%)',
      'Total Points',
      'Attempts Allowed',
      'Status',
      'Created At',
    ].join(',');

    const rows = quizzes.map((quiz) => {
      const course = typeof quiz.course === 'object' ? quiz.course?.title : '';
      const instructor =
        typeof quiz.instructor === 'object'
          ? `${quiz.instructor?.firstName} ${quiz.instructor?.lastName}`
          : '';

      return [
        `"${quiz.title || ''}"`,
        `"${(quiz.description || '').replace(/"/g, '""')}"`,
        `"${course}"`,
        `"${instructor}"`,
        quiz.questions?.length || 0,
        quiz.duration || 0,
        quiz.passingScore || 0,
        quiz.totalPoints || 0,
        quiz.attemptsAllowed || 0,
        quiz.isActive ? 'Active' : 'Inactive',
        quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : '',
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  private exportToExcel(quizzes: any[]): any {
    const data = quizzes.map((quiz) => {
      const course = typeof quiz.course === 'object' ? quiz.course?.title : '';
      const instructor =
        typeof quiz.instructor === 'object'
          ? `${quiz.instructor?.firstName} ${quiz.instructor?.lastName}`
          : '';

      return {
        Title: quiz.title || '',
        Description: quiz.description || '',
        Course: course,
        Instructor: instructor,
        Questions: quiz.questions?.length || 0,
        'Duration (min)': quiz.duration || 0,
        'Passing Score (%)': quiz.passingScore || 0,
        'Total Points': quiz.totalPoints || 0,
        'Attempts Allowed': quiz.attemptsAllowed || 0,
        Status: quiz.isActive ? 'Active' : 'Inactive',
        'Created At': quiz.createdAt
          ? new Date(quiz.createdAt).toLocaleDateString()
          : '',
      };
    });

    return { data, filename: 'quizzes' };
  }

  private exportToPDF(quizzes: any[]): any {
    const data = quizzes.map((quiz) => {
      const course = typeof quiz.course === 'object' ? quiz.course?.title : '';
      const instructor =
        typeof quiz.instructor === 'object'
          ? `${quiz.instructor?.firstName} ${quiz.instructor?.lastName}`
          : '';

      return {
        title: quiz.title || '',
        description: quiz.description || '',
        course,
        instructor,
        questions: quiz.questions?.length || 0,
        duration: quiz.duration || 0,
        passingScore: quiz.passingScore || 0,
        totalPoints: quiz.totalPoints || 0,
        attemptsAllowed: quiz.attemptsAllowed || 0,
        status: quiz.isActive ? 'Active' : 'Inactive',
        createdAt: quiz.createdAt
          ? new Date(quiz.createdAt).toLocaleDateString()
          : '',
      };
    });

    return { data, type: 'quizzes' };
  }
}
