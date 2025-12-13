import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { CourseModule } from '../../course-modules/entities/course-module.entity';

@Injectable()
export class LMSConnectionsService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
    @InjectModel(CourseModule.name) private moduleModel: Model<CourseModule>,
  ) {}

  async getCompleteHierarchy(userId: string, role: string) {
    const totalCourses = await this.courseModel.countDocuments();
    const totalLessons = await this.lessonModel.countDocuments();
    const totalModules = await this.moduleModel.countDocuments();
    return {
      totals: {
        courses: totalCourses,
        modules: totalModules,
        lessons: totalLessons,
      },
    };
  }

  async getCourseStructure(courseId: string, userId: string, role: string) {
    const course = await this.courseModel.findById(courseId).lean();
    if (!course) throw new NotFoundException('Course not found');
    const modules = await this.moduleModel
      .find({ course: courseId })
      .sort({ order: 1 })
      .lean();
    const lessons = await this.lessonModel
      .find({ course: courseId })
      .sort({ order: 1 })
      .lean();
    const stats = {
      totalLessons: lessons.length,
      publishedLessons: lessons.filter((l: any) => l.status === 'published')
        .length,
      videoLessons: lessons.filter((l: any) => l.type === 'video').length,
      quizLessons: lessons.filter((l: any) => l.type === 'quiz').length,
      assignmentLessons: lessons.filter((l: any) => l.type === 'assignment')
        .length,
      totalDuration: lessons.reduce(
        (s: number, l: any) => s + (l.duration || 0),
        0,
      ),
    } as any;
    return { course, modules, lessons, statistics: stats };
  }

  async getCategoryCourses(categoryId: string, includeModules = false) {
    const courses = await this.courseModel
      .find({ categories: { $in: [categoryId] } })
      .lean();
    if (!includeModules)
      return { category: categoryId, courses, total: courses.length };
    const withModules = await Promise.all(
      courses.map(async (c: any) => {
        const mods = await this.moduleModel
          .find({ course: c._id })
          .sort({ order: 1 })
          .lean();
        return { ...c, modules: mods };
      }),
    );
    return {
      category: categoryId,
      courses: withModules,
      total: courses.length,
    };
  }

  async getModuleContent(moduleId: string, userId: string, role: string) {
    const module = await this.moduleModel.findById(moduleId).lean();
    if (!module) throw new NotFoundException('Module not found');
    const lessons = await this.lessonModel
      .find({ module: moduleId })
      .sort({ order: 1 })
      .lean();
    return { module, lessons };
  }

  async getStudentProgress(userId: string, courseId: string) {
    const enrollment = await this.enrollmentModel
      .findOne({
        student: new Types.ObjectId(userId),
        course: new Types.ObjectId(courseId),
      })
      .populate('course');
    if (!enrollment) {
      return { enrolled: false };
    }
    const course: any = enrollment.course;
    const totalLessons = course?.lessons?.length || 0;
    const completedLessons = enrollment.completedLessons
      ? enrollment.completedLessons.size
      : 0;
    return {
      enrolled: true,
      progress: enrollment.progress,
      totalLessons,
      completedLessons,
    };
  }

  async getInstructorDashboard(userId: string, role: string) {
    const courses = await this.courseModel.find({ instructor: userId }).lean();
    const courseIds = courses.map((c) => c._id);
    const enrollments = await this.enrollmentModel
      .find({ course: { $in: courseIds } })
      .lean();
    return {
      stats: {
        totalCourses: courses.length,
        totalStudents: enrollments.length,
      },
      courses,
    };
  }

  async getBreadcrumb(entityType: string, entityId: string) {
    switch (entityType) {
      case 'course': {
        const c = await this.courseModel
          .findById(entityId)
          .select('title slug')
          .lean();
        if (!c) throw new NotFoundException('Course not found');
        return [
          { label: 'Courses', path: '/dashboard/lms/courses', type: 'list' },
          {
            label: c.title,
            path: `/courses/${c['slug'] || c['_id']}`,
            type: 'course',
            current: true,
          },
        ];
      }
      case 'module': {
        const m = await this.moduleModel.findById(entityId).lean();
        if (!m) throw new NotFoundException('Module not found');
        return [
          { label: 'Courses', path: '/dashboard/lms/courses', type: 'list' },
          {
            label: 'Module',
            path: `/dashboard/lms/modules?moduleId=${entityId}`,
            type: 'module',
            current: true,
          },
        ];
      }
      case 'lesson': {
        const l = await this.lessonModel.findById(entityId).lean();
        if (!l) throw new NotFoundException('Lesson not found');
        return [
          { label: 'Lessons', path: '/dashboard/lms/lessons', type: 'list' },
          {
            label: l['title'],
            path: `/dashboard/lms/lessons?lessonId=${entityId}`,
            type: 'lesson',
            current: true,
          },
        ];
      }
      default:
        return [
          { label: 'LMS', path: '/dashboard/lms', type: 'root', current: true },
        ];
    }
  }

  async checkCertificateEligibility(userId: string, courseId: string) {
    const enrollment = await this.enrollmentModel
      .findOne({ student: userId, course: courseId })
      .lean();
    if (!enrollment)
      return {
        userId,
        courseId,
        eligible: false,
        requirements: {},
        certificateAvailable: false,
        completionPercentage: 0,
        missingRequirements: ['enrollment'],
      } as any;
    const eligible = (enrollment.progress || 0) >= 100;
    return {
      userId,
      courseId,
      eligible,
      requirements: {
        courseCompleted: eligible,
        allAssignmentsCompleted: true,
        allQuizzesPassedMinimumScore: true,
        attendanceRequirementMet: true,
      },
      certificateAvailable: eligible,
      completionPercentage: enrollment.progress || 0,
      missingRequirements: eligible ? [] : ['courseCompleted'],
    };
  }
}
