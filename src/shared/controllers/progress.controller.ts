import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';

@ApiTags('Student Progress')
@ApiBearerAuth('JWT-auth')
@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get('my-progress')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get my learning progress across all courses' })
  async getMyProgress(@CurrentUser() user: any) {
    const enrollments = await this.enrollmentModel
      .find({ student: user.userId })
      .populate('course', 'title thumbnail category')
      .sort({ createdAt: -1 });

    const totalEnrollments = enrollments.length;
    const completed = enrollments.filter((e) => e.progress >= 100).length;
    const inProgress = enrollments.filter(
      (e) => e.progress > 0 && e.progress < 100,
    ).length;
    const notStarted = enrollments.filter((e) => e.progress === 0).length;
    const avgProgress =
      enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrollments ||
      0;

    return {
      summary: {
        totalEnrollments,
        completed,
        inProgress,
        notStarted,
        avgProgress: Math.round(avgProgress),
      },
      enrollments: enrollments.map((e) => ({
        course: e.course,
        progress: e.progress,
        status: e.status,
        lastAccessed: e.lastAccessedAt,
        completedLessons: e.completedLessons ? e.completedLessons.size : 0,
      })),
    };
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get detailed progress for specific course' })
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: any,
  ) {
    const enrollment = await this.enrollmentModel
      .findOne({ student: user.userId, course: courseId })
      .populate('course');

    if (!enrollment) {
      return {
        enrolled: false,
        message: 'Not enrolled in this course',
      };
    }

    const course: any = enrollment.course;
    const totalLessons = course?.lessons?.length || 0;
    const completedLessonsCount = enrollment.completedLessons
      ? enrollment.completedLessons.size
      : 0;

    return {
      enrolled: true,
      progress: enrollment.progress,
      status: enrollment.status,
      totalLessons,
      completedLessons: completedLessonsCount,
      remainingLessons: totalLessons - completedLessonsCount,
      lastAccessedAt: enrollment.lastAccessedAt,
      totalTimeSpent: enrollment.totalTimeSpent,
      quizzesPassed: enrollment.quizzesPassed,
      assignmentsCompleted: enrollment.assignmentsCompleted,
      certificateEligible:
        enrollment.progress >= 100 && enrollment.quizzesPassed >= 1,
      nextLesson: this.getNextLesson(course, enrollment),
    };
  }

  @Get('student/:studentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get student progress (admin/instructor view)' })
  async getStudentProgress(@Param('studentId') studentId: string) {
    const student = await this.userModel
      .findById(studentId)
      .select('firstName lastName email');

    if (!student) {
      return { error: 'Student not found' };
    }

    const enrollments = await this.enrollmentModel
      .find({ student: studentId })
      .populate('course', 'title category instructor')
      .sort({ createdAt: -1 });

    const totalEnrollments = enrollments.length;
    const completed = enrollments.filter((e) => e.progress >= 100).length;
    const avgProgress =
      enrollments.reduce((sum, e) => sum + e.progress, 0) / totalEnrollments ||
      0;
    const totalTimeSpent = enrollments.reduce(
      (sum, e) => sum + e.totalTimeSpent,
      0,
    );

    return {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
      },
      summary: {
        totalEnrollments,
        completed,
        inProgress: enrollments.filter(
          (e) => e.progress > 0 && e.progress < 100,
        ).length,
        avgProgress: Math.round(avgProgress),
        totalTimeSpent: Math.round(totalTimeSpent),
      },
      enrollments: enrollments.map((e) => ({
        course: e.course,
        progress: e.progress,
        status: e.status,
        lastAccessed: e.lastAccessedAt,
        timeSpent: e.totalTimeSpent,
      })),
    };
  }

  @Get('course/:courseId/students')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get all students progress in a course' })
  async getCourseStudentsProgress(@Param('courseId') courseId: string) {
    const course = await this.courseModel.findById(courseId).select('title');

    if (!course) {
      return { error: 'Course not found' };
    }

    const enrollments = await this.enrollmentModel
      .find({ course: courseId })
      .populate('student', 'firstName lastName email')
      .sort({ progress: -1 });

    const stats = {
      totalStudents: enrollments.length,
      completed: enrollments.filter((e) => e.progress >= 100).length,
      inProgress: enrollments.filter((e) => e.progress > 0 && e.progress < 100)
        .length,
      notStarted: enrollments.filter((e) => e.progress === 0).length,
      avgProgress:
        enrollments.reduce((sum, e) => sum + e.progress, 0) /
          enrollments.length || 0,
    };

    return {
      course: {
        id: course._id,
        title: course.title,
      },
      stats,
      students: enrollments.map((e) => {
        const student: any = e.student;
        return {
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
          },
          progress: e.progress,
          status: e.status,
          lastAccessed: e.lastAccessedAt,
          completedLessons: e.completedLessons ? e.completedLessons.size : 0,
        };
      }),
    };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get top performing students' })
  async getLeaderboard(@Query() query: { courseId?: string; limit?: number }) {
    const limit = parseInt(query.limit as any) || 10;
    const match: any = {};
    if (query.courseId) match.course = query.courseId;

    const leaderboard = await this.enrollmentModel
      .find(match)
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title')
      .sort({ progress: -1, totalTimeSpent: 1 })
      .limit(limit);

    return {
      leaderboard: leaderboard.map((e, index) => {
        const student: any = e.student;
        return {
          rank: index + 1,
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            avatar: student.avatar,
          },
          course: e.course,
          progress: e.progress,
          timeSpent: e.totalTimeSpent,
          quizzesPassed: e.quizzesPassed,
          assignmentsCompleted: e.assignmentsCompleted,
        };
      }),
    };
  }

  private getNextLesson(course: any, enrollment: any) {
    if (!course?.lessons || course.lessons.length === 0) {
      return null;
    }

    // Find first incomplete lesson
    for (const lesson of course.lessons) {
      const isCompleted = enrollment.completedLessons?.get(
        lesson._id.toString(),
      );
      if (!isCompleted) {
        return {
          id: lesson._id,
          title: lesson.title,
          order: lesson.order,
        };
      }
    }

    return null; // All lessons completed
  }
}
