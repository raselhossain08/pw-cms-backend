import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { Enrollment, EnrollmentStatus } from '../../enrollments/entities/enrollment.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    let courseId = request.params.courseId || request.params.id;

    // If lessonId is provided, get courseId from lesson
    if (!courseId && request.params.lessonId) {
      const lesson = await this.lessonModel.findById(request.params.lessonId);
      if (lesson) {
        courseId = lesson.course?.toString();
      }
    }

    if (!courseId) {
      throw new NotFoundException('Course ID is required');
    }

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Admins and instructors can always access
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Find course
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if course is free
    if (course.isFree || course.price === 0) {
      // For free courses, auto-enroll if not already enrolled
      const enrollment = await this.enrollmentModel.findOne({
        student: user.id,
        course: courseId,
      });

      if (!enrollment) {
        // Auto-enroll in free course
        await this.enrollmentModel.create({
          student: user.id,
          course: courseId,
          status: EnrollmentStatus.ACTIVE,
          lastAccessedAt: new Date(),
        });
      }

      return true;
    }

    // For paid courses, check enrollment
    const enrollment = await this.enrollmentModel.findOne({
      student: user.id,
      course: courseId,
      status: { $in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You must be enrolled in this course to access its content',
      );
    }

    return true;
  }
}
