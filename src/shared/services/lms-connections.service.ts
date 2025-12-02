import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { Lesson } from '../../courses/entities/lesson.entity';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class LMSConnectionsService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
  ) {}

  /**
   * Get complete LMS hierarchy with categories -> courses -> modules -> lessons
   */
  async getCompleteHierarchy(userId: string, userRole: UserRole) {
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isInstructor = userRole === UserRole.INSTRUCTOR;

    // Build query based on role
    const courseQuery: any = {};
    if (!isAdmin) {
      if (isInstructor) {
        courseQuery.instructor = new Types.ObjectId(userId);
      } else {
        courseQuery.status = 'published';
      }
    }

    // Get all courses with populated instructor
    const courses = await this.courseModel
      .find(courseQuery)
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Get all lessons for these courses
    const courseIds = courses.map((c: any) => c._id);
    const lessons = await this.lessonModel
      .find({ course: { $in: courseIds } })
      .sort({ order: 1 })
      .lean()
      .exec();

    // Group lessons by course
    const lessonsByCourse = lessons.reduce((acc: any, lesson: any) => {
      const courseId = lesson.course.toString();
      if (!acc[courseId]) {
        acc[courseId] = [];
      }
      acc[courseId].push(lesson);
      return acc;
    }, {});

    // Group courses by category
    const categorizedCourses = courses.reduce((acc: any, course: any) => {
      const categories = course.categories || ['uncategorized'];
      categories.forEach((category: string) => {
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push({
          ...course,
          lessonsCount: lessonsByCourse[course._id.toString()]?.length || 0,
          lessons: lessonsByCourse[course._id.toString()] || [],
        });
      });
      return acc;
    }, {});

    return {
      categories: Object.keys(categorizedCourses).map((category) => ({
        name: category,
        courses: categorizedCourses[category],
        coursesCount: categorizedCourses[category].length,
      })),
      totalCourses: courses.length,
      totalLessons: lessons.length,
      hierarchy: {
        categories: Object.keys(categorizedCourses).length,
        courses: courses.length,
        lessons: lessons.length,
      },
    };
  }

  /**
   * Get complete course structure with all related entities
   */
  async getCourseStructure(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundException('Invalid course ID');
    }

    const course = await this.courseModel
      .findById(courseId)
      .populate('instructor', 'firstName lastName email avatar')
      .lean()
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check access
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const isInstructor =
      userRole === UserRole.INSTRUCTOR &&
      course.instructor &&
      (course.instructor as any)._id.toString() === userId;
    const isPublished = course.status === 'published';

    if (!isAdmin && !isInstructor && !isPublished) {
      throw new NotFoundException('Course not found');
    }

    // Get lessons
    const lessonQuery: any = { course: new Types.ObjectId(courseId) };
    if (!isAdmin && !isInstructor) {
      lessonQuery.status = 'published';
    }

    const lessons = await this.lessonModel
      .find(lessonQuery)
      .sort({ order: 1 })
      .lean()
      .exec();

    // Calculate course statistics
    const totalDuration = lessons.reduce(
      (sum: number, lesson: any) => sum + (lesson.duration || 0),
      0,
    );
    const publishedLessons = lessons.filter(
      (l: any) => l.status === 'published',
    );
    const videoLessons = lessons.filter((l: any) => l.type === 'video');
    const quizLessons = lessons.filter((l: any) => l.type === 'quiz');
    const assignmentLessons = lessons.filter(
      (l: any) => l.type === 'assignment',
    );

    return {
      course: {
        ...course,
        id: (course as any)._id.toString(),
        _id: (course as any)._id.toString(),
      },
      lessons: lessons.map((lesson: any) => ({
        ...lesson,
        id: lesson._id.toString(),
        _id: lesson._id.toString(),
      })),
      statistics: {
        totalLessons: lessons.length,
        publishedLessons: publishedLessons.length,
        videoLessons: videoLessons.length,
        quizLessons: quizLessons.length,
        assignmentLessons: assignmentLessons.length,
        totalDuration,
        totalDurationHours: Math.round(totalDuration / 3600),
        completionRate: course.completionRate || 0,
        studentCount: course.studentCount || 0,
        rating: course.rating || 0,
        reviewCount: course.reviewCount || 0,
      },
      relationships: {
        category: course.categories?.[0] || 'uncategorized',
        categories: course.categories || [],
        instructorId:
          course.instructor && (course.instructor as any)._id
            ? (course.instructor as any)._id.toString()
            : null,
        hasModules: false, // Will be true when modules are implemented
        hasCertificate: course.providesCertificate || false,
      },
    };
  }

  /**
   * Get all courses in a category
   */
  async getCategoryCourses(categoryId: string, includeModules = false) {
    const courses = await this.courseModel
      .find({
        categories: categoryId,
        status: 'published',
      })
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ rating: -1, studentCount: -1 })
      .lean()
      .exec();

    if (includeModules) {
      const courseIds = courses.map((c: any) => c._id);
      const lessons = await this.lessonModel
        .find({
          course: { $in: courseIds },
          status: 'published',
        })
        .sort({ order: 1 })
        .lean()
        .exec();

      const lessonsByCourse = lessons.reduce((acc: any, lesson: any) => {
        const courseId = lesson.course.toString();
        if (!acc[courseId]) {
          acc[courseId] = [];
        }
        acc[courseId].push(lesson);
        return acc;
      }, {});

      return {
        category: categoryId,
        courses: courses.map((course: any) => ({
          ...course,
          id: course._id.toString(),
          _id: course._id.toString(),
          lessons: lessonsByCourse[course._id.toString()] || [],
          lessonsCount: lessonsByCourse[course._id.toString()]?.length || 0,
        })),
        total: courses.length,
      };
    }

    return {
      category: categoryId,
      courses: courses.map((course: any) => ({
        ...course,
        id: course._id.toString(),
        _id: course._id.toString(),
      })),
      total: courses.length,
    };
  }

  /**
   * Get module with all content (lessons, assignments, quizzes)
   * Note: This is a placeholder for future module implementation
   */
  async getModuleContent(moduleId: string, userId: string, userRole: UserRole) {
    // When modules are implemented, this will fetch module with related content
    // For now, return structure for future use
    return {
      module: {
        id: moduleId,
        message:
          'Module system will be implemented. Currently courses contain lessons directly.',
      },
      lessons: [],
      assignments: [],
      quizzes: [],
    };
  }

  /**
   * Get student progress for a course
   */
  async getStudentProgress(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundException('Invalid course ID');
    }

    const course = await this.courseModel.findById(courseId).lean().exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessons = await this.lessonModel
      .find({ course: new Types.ObjectId(courseId), status: 'published' })
      .sort({ order: 1 })
      .lean()
      .exec();

    // TODO: Implement actual progress tracking from enrollments/progress collection
    // For now, return structure
    return {
      userId,
      courseId,
      courseName: course.title,
      totalLessons: lessons.length,
      completedLessons: 0, // Will be from progress tracking
      completionPercentage: 0,
      lessons: lessons.map((lesson: any) => ({
        id: lesson._id.toString(),
        title: lesson.title,
        type: lesson.type,
        order: lesson.order,
        duration: lesson.duration,
        completed: false, // Will be from progress tracking
        completedAt: null,
      })),
      assignments: {
        total: 0,
        completed: 0,
        pending: 0,
      },
      quizzes: {
        total: 0,
        completed: 0,
        averageScore: 0,
      },
      certificateEligible: false,
      nextLesson: lessons[0]
        ? {
            id: lessons[0]._id.toString(),
            title: lessons[0].title,
          }
        : null,
    };
  }

  /**
   * Get instructor dashboard with all connected data
   */
  async getInstructorDashboard(userId: string, userRole: UserRole) {
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    const courseQuery: any = isAdmin
      ? {}
      : { instructor: new Types.ObjectId(userId) };

    const courses = await this.courseModel
      .find(courseQuery)
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const courseIds = courses.map((c: any) => c._id);
    const lessons = await this.lessonModel
      .find({ course: { $in: courseIds } })
      .lean()
      .exec();

    // Calculate statistics
    const totalStudents = courses.reduce(
      (sum: number, course: any) => sum + (course.studentCount || 0),
      0,
    );
    const totalRevenue = courses.reduce(
      (sum: number, course: any) => sum + (course.totalRevenue || 0),
      0,
    );
    const publishedCourses = courses.filter(
      (c: any) => c.status === 'published',
    );
    const draftCourses = courses.filter((c: any) => c.status === 'draft');

    return {
      instructor: {
        id: userId,
        role: userRole,
      },
      statistics: {
        totalCourses: courses.length,
        publishedCourses: publishedCourses.length,
        draftCourses: draftCourses.length,
        totalLessons: lessons.length,
        totalStudents,
        totalRevenue,
        averageRating:
          courses.reduce((sum: number, c: any) => sum + (c.rating || 0), 0) /
            courses.length || 0,
      },
      courses: courses.map((course: any) => ({
        id: course._id.toString(),
        title: course.title,
        status: course.status,
        studentCount: course.studentCount || 0,
        rating: course.rating || 0,
        revenue: course.totalRevenue || 0,
        lessonsCount: lessons.filter(
          (l: any) => l.course.toString() === course._id.toString(),
        ).length,
      })),
      recentActivity: {
        newEnrollments: 0, // TODO: Implement from enrollments
        pendingReviews: 0, // TODO: Implement from reviews
        completedCourses: 0, // TODO: Implement from certificates
      },
    };
  }

  /**
   * Get breadcrumb navigation for any entity
   */
  async getBreadcrumb(entityType: string, entityId: string) {
    const breadcrumb: any[] = [
      { label: 'Dashboard', path: '/dashboard', type: 'root' },
      { label: 'LMS', path: '/lms', type: 'section' },
    ];

    switch (entityType.toLowerCase()) {
      case 'course':
        const course = await this.courseModel.findById(entityId).lean().exec();
        if (course) {
          if (course.categories && course.categories.length > 0) {
            breadcrumb.push({
              label: course.categories[0],
              path: `/lms/course-categories?category=${course.categories[0]}`,
              type: 'category',
            });
          }
          breadcrumb.push({
            label: course.title,
            path: `/lms/courses/${entityId}`,
            type: 'course',
            current: true,
          });
        }
        break;

      case 'lesson':
        const lesson = await this.lessonModel
          .findById(entityId)
          .populate('course')
          .lean()
          .exec();
        if (lesson && lesson.course) {
          const lessonCourse = lesson.course as any;
          if (lessonCourse.categories && lessonCourse.categories.length > 0) {
            breadcrumb.push({
              label: lessonCourse.categories[0],
              path: `/lms/course-categories?category=${lessonCourse.categories[0]}`,
              type: 'category',
            });
          }
          breadcrumb.push({
            label: lessonCourse.title,
            path: `/lms/courses/${lessonCourse._id}`,
            type: 'course',
          });
          breadcrumb.push({
            label: lesson.title,
            path: `/lms/lessons/${entityId}`,
            type: 'lesson',
            current: true,
          });
        }
        break;

      case 'category':
        breadcrumb.push({
          label: 'Course Categories',
          path: '/lms/course-categories',
          type: 'categories',
        });
        breadcrumb.push({
          label: entityId,
          path: `/lms/course-categories?category=${entityId}`,
          type: 'category',
          current: true,
        });
        break;

      default:
        breadcrumb.push({
          label: entityType,
          path: `/lms/${entityType}s`,
          type: entityType,
          current: true,
        });
    }

    return { breadcrumb, entityType, entityId };
  }

  /**
   * Check if student is eligible for course certificate
   */
  async checkCertificateEligibility(userId: string, courseId: string) {
    if (!Types.ObjectId.isValid(courseId)) {
      throw new NotFoundException('Invalid course ID');
    }

    const course = await this.courseModel.findById(courseId).lean().exec();
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessons = await this.lessonModel
      .find({ course: new Types.ObjectId(courseId), status: 'published' })
      .lean()
      .exec();

    // TODO: Check actual progress, assignments, and quiz completion
    const requirements = {
      courseCompleted: false, // Check from progress
      allAssignmentsCompleted: false, // Check from assignments
      allQuizzesPassedMinimumScore: false, // Check from quiz attempts
      attendanceRequirementMet: true, // For live sessions
    };

    const eligible =
      course.providesCertificate &&
      requirements.courseCompleted &&
      requirements.allAssignmentsCompleted &&
      requirements.allQuizzesPassedMinimumScore &&
      requirements.attendanceRequirementMet;

    return {
      userId,
      courseId,
      courseName: course.title,
      eligible,
      requirements,
      certificateAvailable: course.providesCertificate || false,
      completionPercentage: 0, // TODO: Calculate from actual progress
      missingRequirements: Object.entries(requirements)
        .filter(([, value]) => !value)
        .map(([key]) => key),
    };
  }
}
