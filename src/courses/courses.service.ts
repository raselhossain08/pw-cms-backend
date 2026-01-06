import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseStatus } from './entities/course.entity';
import { Lesson } from './entities/lesson.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { CourseModule } from '../course-modules/entities/course-module.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
    @InjectModel(CourseModule.name)
    private courseModuleModel: Model<CourseModule>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
  ) {}

  async getRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<Course[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Get user's enrolled courses with categories and levels
      const enrollments = await this.enrollmentModel
        .find({ student: userObjectId })
        .populate('course', 'categories level')
        .lean();

      const enrolledCourseIds = enrollments
        .map((e: any) => e.course?._id?.toString())
        .filter(Boolean);
      const enrolledCategories = enrollments
        .map((e: any) => e.course?.categories || [])
        .flat()
        .filter(Boolean);
      const enrolledLevels = enrollments
        .map((e: any) => e.course?.level)
        .filter(Boolean);

      // Build recommendation query
      const recommendationQuery: any = {
        _id: { $nin: enrolledCourseIds.map((id) => new Types.ObjectId(id)) },
        status: CourseStatus.PUBLISHED,
      };

      // Score and fetch courses
      const courses = await this.courseModel
        .find(recommendationQuery)
        .populate('instructor', 'firstName lastName')
        .limit(limit * 3) // Fetch more to score and filter
        .lean()
        .exec();

      // Score each course based on relevance
      const scoredCourses = courses.map((course: any) => {
        let score = 0;

        // Category match (highest weight)
        const courseCategories = course.categories || [];
        const hasMatchingCategory = courseCategories.some((cat: string) =>
          enrolledCategories.includes(cat),
        );
        if (hasMatchingCategory) {
          score += 10;
        }

        // Level match (progressive learning)
        if (
          enrolledLevels.includes('beginner') &&
          course.level === 'intermediate'
        ) {
          score += 8;
        } else if (
          enrolledLevels.includes('intermediate') &&
          course.level === 'advanced'
        ) {
          score += 8;
        } else if (enrolledLevels.includes(course.level)) {
          score += 5;
        }

        // Popularity (enrollment count)
        score += Math.min((course.totalEnrollments || 0) / 10, 5);

        // Rating
        score += Math.min(course.rating || 0, 5);

        // Featured courses get bonus
        if (course.isFeatured) {
          score += 3;
        }

        // Recently created courses get slight boost
        const daysSinceCreation =
          (Date.now() - new Date(course.createdAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 30) {
          score += 2;
        }

        return { ...course, recommendationScore: score };
      });

      // Sort by score and return top results with normalized fields
      return scoredCourses
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit)
        .map(({ recommendationScore, ...course }) => ({
          ...course,
          id: course._id.toString(),
          _id: course._id.toString(),
          students: course.totalEnrollments || course.students || 0,
          enrollmentCount: course.totalEnrollments || course.students || 0,
          reviews: course.ratingCount || course.reviews || 0,
          ratingCount: course.ratingCount || course.reviews || 0,
          totalLessons: course.totalLessons || course.lessons?.length || 0,
          instructor: course.instructor
            ? {
                ...course.instructor,
                id: course.instructor._id.toString(),
                _id: course.instructor._id.toString(),
              }
            : null,
        })) as any as Course[];
    } catch (error) {
      console.error('Error getting recommendations:', error);
      // Fallback to popular/featured courses
      const fallbackCourses = await this.courseModel
        .find({ status: CourseStatus.PUBLISHED })
        .populate('instructor', 'firstName lastName')
        .sort({ totalEnrollments: -1, rating: -1 })
        .limit(limit)
        .lean()
        .exec();

      return fallbackCourses.map((course: any) => ({
        ...course,
        id: course._id.toString(),
        _id: course._id.toString(),
        students: course.totalEnrollments || course.students || 0,
        enrollmentCount: course.totalEnrollments || course.students || 0,
        reviews: course.ratingCount || course.reviews || 0,
        ratingCount: course.ratingCount || course.reviews || 0,
        totalLessons: course.totalLessons || course.lessons?.length || 0,
        instructor: course.instructor
          ? {
              ...course.instructor,
              id: course.instructor._id.toString(),
              _id: course.instructor._id.toString(),
            }
          : null,
      })) as any as Course[];
    }
  }

  async compareCourses(courseIds: string[]): Promise<any> {
    try {
      const courses = await Promise.all(
        courseIds.map((id) =>
          this.courseModel
            .findById(id)
            .populate('instructor', 'firstName lastName email')
            .lean()
            .exec(),
        ),
      );

      // Filter out null courses (invalid IDs)
      const validCourses = courses.filter((course) => course !== null) as any[];

      if (validCourses.length === 0) {
        throw new NotFoundException('No valid courses found for comparison');
      }

      // Return structured comparison data
      return {
        courses: validCourses,
        comparison: {
          count: validCourses.length,
          priceRange: {
            min: Math.min(...validCourses.map((c) => c.price || 0)),
            max: Math.max(...validCourses.map((c) => c.price || 0)),
          },
          avgRating:
            validCourses.reduce((sum, c) => sum + (c.rating || 0), 0) /
            validCourses.length,
          totalStudents: validCourses.reduce(
            (sum, c) => sum + (c.totalEnrollments || 0),
            0,
          ),
          levels: [
            ...new Set(validCourses.map((c) => c.level).filter(Boolean)),
          ],
          categories: [
            ...new Set(
              validCourses
                .map((c) => c.categories || [])
                .flat()
                .filter(Boolean),
            ),
          ],
        },
      };
    } catch (error) {
      console.error('Error comparing courses:', error);
      throw error;
    }
  }

  async create(
    createCourseDto: CreateCourseDto,
    instructorId: string,
  ): Promise<Course> {
    console.log(
      'Creating course with DTO:',
      JSON.stringify(createCourseDto, null, 2),
    );
    console.log('Thumbnail URL:', createCourseDto.thumbnail);

    const cleanTitle = (createCourseDto.title || '').toLowerCase().trim();
    let slug = (createCourseDto.slug || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    if (!slug && cleanTitle) {
      slug = cleanTitle
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }

    if (!slug) {
      throw new ConflictException('Course slug could not be generated');
    }

    // Ensure unique slug
    const baseSlug = slug;
    let counter = 1;
    while (await this.courseModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const duration =
      (createCourseDto as any).duration ?? createCourseDto.durationHours;

    // Transform isPublished to status - default to PUBLISHED
    const courseData: any = { ...createCourseDto };
    if (createCourseDto.isPublished !== undefined) {
      courseData.status = createCourseDto.isPublished
        ? CourseStatus.PUBLISHED
        : CourseStatus.DRAFT;
      delete courseData.isPublished;
    } else {
      // Automatically set status to PUBLISHED if not specified
      courseData.status = CourseStatus.PUBLISHED;
    }

    // Handle isFree flag - if isFree is true, set price to 0
    if (courseData.isFree === true) {
      courseData.price = 0;
    } else if (courseData.price === 0) {
      // If price is 0, automatically set isFree to true
      courseData.isFree = true;
    } else {
      courseData.isFree = courseData.isFree || false;
    }

    const course = new this.courseModel({
      ...courseData,
      slug,
      duration,
      instructor: new Types.ObjectId(instructorId),
    });

    const savedCourse = await course.save();
    console.log('Saved course thumbnail:', savedCourse.thumbnail);
    return savedCourse;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    level?: string,
    status?: CourseStatus,
    instructorId?: string,
  ): Promise<{ courses: Course[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    if (level) {
      query.level = level;
    }

    if (status) {
      query.status = status;
    }

    if (instructorId) {
      query.instructor = new Types.ObjectId(instructorId);
    }

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(query)
        .populate('instructor', 'firstName lastName email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.courseModel.countDocuments(query),
    ]);

    // Convert _id to id for each course and normalize fields
    const serializedCourses = courses.map((course: any) => ({
      ...course,
      id: course._id.toString(),
      _id: course._id.toString(),
      students: course.totalEnrollments || course.students || 0,
      enrollmentCount: course.totalEnrollments || course.students || 0,
      reviews: course.ratingCount || course.reviews || 0,
      ratingCount: course.ratingCount || course.reviews || 0,
      totalLessons: course.totalLessons || course.lessons?.length || 0,
      instructor: course.instructor
        ? {
            ...course.instructor,
            id: course.instructor._id.toString(),
            _id: course.instructor._id.toString(),
          }
        : null,
    }));

    return { courses: serializedCourses, total };
  }

  async findById(id: string): Promise<Course> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Course not found');
    }

    const course = await this.courseModel
      .findById(id)
      .populate(
        'instructor',
        'firstName lastName email avatar bio certifications flightHours',
      )
      .populate({
        path: 'modules',
        populate: {
          path: 'lessons',
          select: 'title duration order type status videoUrl',
        },
      })
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseModel
      .findOne({ slug })
      // Temporarily removed status filter to allow draft courses in development
      // .findOne({ slug, status: CourseStatus.PUBLISHED })
      .populate(
        'instructor',
        'firstName lastName email avatar bio certifications flightHours',
      )
      .populate({
        path: 'modules',
        populate: {
          path: 'lessons',
          select: 'title duration order type status videoUrl',
        },
      })
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findByIds(ids: string[]): Promise<Course[]> {
    if (!ids.length) return [];

    const objectIds = ids.map((id) => {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException(`Invalid course ID: ${id}`);
      }
      return new Types.ObjectId(id);
    });

    return await this.courseModel.find({ _id: { $in: objectIds } }).exec();
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    // Handle isFree flag - if isFree is true, set price to 0
    const courseData: any = { ...updateCourseDto };
    if (courseData.isFree === true) {
      courseData.price = 0;
    } else if (courseData.price === 0) {
      // If price is 0, automatically set isFree to true
      courseData.isFree = true;
    } else if (courseData.price !== undefined && courseData.price > 0) {
      courseData.isFree = false;
    }

    console.log(
      'Updating course with DTO:',
      JSON.stringify(courseData, null, 2),
    );
    console.log('Thumbnail URL:', updateCourseDto.thumbnail);

    const course = await this.findById(id);

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only update your own courses');
    }

    if (updateCourseDto.slug && updateCourseDto.slug !== course.slug) {
      const existingCourse = await this.courseModel.findOne({
        slug: updateCourseDto.slug,
        _id: { $ne: id },
      });
      if (existingCourse) {
        throw new ConflictException('Course with this slug already exists');
      }
    }

    // Transform isPublished to status
    const updateData: any = { ...updateCourseDto };
    if (updateCourseDto.isPublished !== undefined) {
      updateData.status = updateCourseDto.isPublished
        ? CourseStatus.PUBLISHED
        : CourseStatus.DRAFT;
      delete updateData.isPublished;
    }

    // Handle isFree flag - if isFree is true, set price to 0
    if (updateData.isFree === true) {
      updateData.price = 0;
    } else if (updateData.price === 0) {
      // If price is 0, automatically set isFree to true
      updateData.isFree = true;
    } else if (updateData.price !== undefined && updateData.price > 0) {
      updateData.isFree = false;
    }

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('instructor', 'firstName lastName email avatar');

    if (!updatedCourse) {
      throw new NotFoundException('Course not found');
    }

    console.log('Updated course thumbnail:', updatedCourse.thumbnail);
    return updatedCourse;
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const course = await this.findById(id);

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    await this.lessonModel.deleteMany({ course: id });
    const result = await this.courseModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Course not found');
    }
  }

  async getFeaturedCourses(limit: number = 6): Promise<Course[]> {
    const courses = await this.courseModel
      .find({
        status: CourseStatus.PUBLISHED,
        isFeatured: true,
      })
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ rating: -1, studentCount: -1 })
      .limit(limit)
      .lean()
      .exec();

    // Normalize fields for frontend consistency
    return courses.map((course: any) => ({
      ...course,
      id: course._id.toString(),
      _id: course._id.toString(),
      students: course.totalEnrollments || course.students || 0,
      enrollmentCount: course.totalEnrollments || course.students || 0,
      reviews: course.ratingCount || course.reviews || 0,
      ratingCount: course.ratingCount || course.reviews || 0,
      totalLessons: course.totalLessons || course.lessons?.length || 0,
      instructor: course.instructor
        ? {
            ...course.instructor,
            id: course.instructor._id.toString(),
            _id: course.instructor._id.toString(),
          }
        : null,
    })) as any;
  }

  async getInstructorCourses(
    instructorId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ courses: Course[]; total: number }> {
    return this.findAll(
      page,
      limit,
      undefined,
      undefined,
      undefined,
      instructorId,
    );
  }

  // Lesson Management
  async createLesson(
    courseId: string,
    createLessonDto: CreateLessonDto,
    instructorId: string,
    userRole?: UserRole,
  ): Promise<Lesson> {
    const course = await this.findById(courseId);

    // Handle both populated and unpopulated instructor
    const courseInstructorId = (course.instructor as any)._id
      ? (course.instructor as any)._id.toString()
      : course.instructor.toString();

    // Allow admins and super_admins to add lessons to any course
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (courseInstructorId !== instructorId && !isAdmin) {
      throw new ForbiddenException(
        'You can only add lessons to your own courses',
      );
    }
    let slug = (createLessonDto as any).slug as string | undefined;
    if (!slug) {
      slug = (createLessonDto.title || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    const existingLesson = await this.lessonModel.findOne({
      course: courseId,
      slug,
    });
    if (existingLesson) {
      slug = `${slug}-${Date.now()}`;
    }

    const lessonData: any = {
      ...createLessonDto,
      slug,
      course: courseId,
    };
    if ((createLessonDto as any).moduleId) {
      lessonData.module = new Types.ObjectId((createLessonDto as any).moduleId);
    }
    if (!lessonData.order) {
      const filter: any = { course: courseId };
      if (lessonData.module) filter.module = lessonData.module;
      const count = await this.lessonModel.countDocuments(filter);
      lessonData.order = count + 1;
    }
    const lesson = new this.lessonModel(lessonData);
    const savedLesson = await lesson.save();

    // Update module's lessons array
    if (lessonData.module) {
      await this.courseModuleModel.findByIdAndUpdate(
        lessonData.module,
        { $addToSet: { lessons: savedLesson._id } },
        { new: true },
      );
    }

    return savedLesson;
  }

  async getCourseLessons(
    courseId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<Lesson[]> {
    const course = await this.findById(courseId);

    const query: any = { course: courseId };
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      query.status = 'published';
    }

    return await this.lessonModel
      .find(query)
      .populate('module', 'title')
      .populate('course', 'title')
      .sort({ order: 1 })
      .exec();
  }

  async getLesson(
    lessonId: string,
    userId?: string,
    userRole?: UserRole,
  ): Promise<Lesson> {
    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('module', 'title')
      .populate('course', 'title instructor')
      .exec();

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if user has access to the lesson
    const course = lesson.course as any;
    const courseInstructorId = course.instructor?._id
      ? course.instructor._id.toString()
      : course.instructor?.toString();

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      courseInstructorId !== userId &&
      lesson.status !== 'published'
    ) {
      throw new ForbiddenException('You do not have access to this lesson');
    }

    return lesson;
  }

  async updateLesson(
    lessonId: string,
    updateData: any,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(lessonId).populate('course');
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = lesson.course as Course;

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only update lessons in your own courses',
      );
    }

    // Handle moduleId conversion to module
    if (updateData.moduleId !== undefined) {
      updateData.module = updateData.moduleId || null;
      delete updateData.moduleId;
    }

    const updatedLesson = await this.lessonModel
      .findByIdAndUpdate(lessonId, updateData, { new: true })
      .populate('module')
      .populate('course');

    if (!updatedLesson) {
      throw new NotFoundException('Lesson not found');
    }

    return updatedLesson;
  }

  async deleteLesson(
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const lesson = await this.lessonModel.findById(lessonId).populate('course');
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = lesson.course as Course;

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only delete lessons in your own courses',
      );
    }

    const result = await this.lessonModel.findByIdAndDelete(lessonId);
    if (!result) {
      throw new NotFoundException('Lesson not found');
    }
  }

  async reorderLessons(
    courseId: string,
    lessonIds: string[],
    userId: string,
    userRole: UserRole,
    moduleId?: string,
  ): Promise<{ message: string }> {
    const course = await this.findById(courseId);
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only reorder lessons in your own courses',
      );
    }

    // Validate lessons belong to the course
    const filter: any = { _id: { $in: lessonIds }, course: courseId };
    if (moduleId) filter.module = new Types.ObjectId(moduleId);
    const lessons = await this.lessonModel.find(filter).select('_id').exec();
    const foundIds = new Set(lessons.map((l) => (l._id as any).toString()));
    for (const id of lessonIds) {
      if (!foundIds.has(id)) {
        throw new BadRequestException('Invalid lesson IDs for this course');
      }
    }

    // Apply new order (1-based)
    const bulk = lessonIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));
    await (this.lessonModel as any).bulkWrite(bulk);
    return { message: 'Lessons reordered' };
  }

  async toggleLessonStatus(
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(lessonId).populate('course');
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = lesson.course as Course;

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only update lessons in your own courses',
      );
    }

    const currentStatus = lesson.status || 'draft';
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';

    lesson.status = newStatus as any;
    return await lesson.save();
  }

  async bulkDeleteLessons(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ deleted: number }> {
    const lessons = await this.lessonModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .populate('course');

    if (lessons.length === 0) {
      throw new NotFoundException('No lessons found to delete');
    }

    // Check permissions
    for (const lesson of lessons) {
      const course = lesson.course as Course;
      if (
        userRole !== UserRole.ADMIN &&
        userRole !== UserRole.SUPER_ADMIN &&
        course.instructor.toString() !== userId
      ) {
        throw new ForbiddenException('You can only delete your own lessons');
      }
    }

    await this.lessonModel.deleteMany({
      _id: { $in: lessons.map((l) => l._id) },
    });

    return { deleted: lessons.length };
  }

  async bulkToggleLessonStatus(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ updated: number }> {
    const lessons = await this.lessonModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .populate('course');

    if (lessons.length === 0) {
      throw new NotFoundException('No lessons found to update');
    }

    // Check permissions
    for (const lesson of lessons) {
      const course = lesson.course as Course;
      if (
        userRole !== UserRole.ADMIN &&
        userRole !== UserRole.SUPER_ADMIN &&
        course.instructor.toString() !== userId
      ) {
        throw new ForbiddenException('You can only update your own lessons');
      }
    }

    // Toggle status for all lessons
    const bulkOps = lessons.map((lesson) => {
      const currentStatus = lesson.status || 'draft';
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      return {
        updateOne: {
          filter: { _id: lesson._id },
          update: { $set: { status: newStatus } },
        },
      };
    });

    await (this.lessonModel as any).bulkWrite(bulkOps);

    return { updated: lessons.length };
  }

  async duplicateLesson(
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Lesson> {
    const originalLesson = await this.lessonModel
      .findById(lessonId)
      .populate('course')
      .exec();

    if (!originalLesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = originalLesson.course as Course;

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only duplicate lessons in your own courses',
      );
    }

    // Create slug for duplicate
    const baseSlug = originalLesson.slug;
    let newSlug = `${baseSlug}-copy`;
    let counter = 1;

    // Ensure unique slug
    while (await this.lessonModel.findOne({ slug: newSlug })) {
      newSlug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    // Get highest order number for the course and module
    const filter: any = { course: originalLesson.course };
    if (originalLesson.module) {
      filter.module = originalLesson.module;
    }
    const maxOrderLesson = await this.lessonModel
      .findOne(filter)
      .sort({ order: -1 })
      .select('order')
      .exec();
    const newOrder = (maxOrderLesson?.order || 0) + 1;

    // Remove fields that shouldn't be duplicated
    const lessonData: any = originalLesson.toObject();
    delete lessonData._id;
    delete lessonData.createdAt;
    delete lessonData.updatedAt;
    delete lessonData.completionCount;
    delete lessonData.averageScore;

    // Create new lesson with modified data
    const duplicatedLesson = new this.lessonModel({
      ...lessonData,
      title: `${originalLesson.title} (Copy)`,
      slug: newSlug,
      order: newOrder,
      status: 'draft',
    });

    return await duplicatedLesson.save();
  }

  async exportLessons(
    format: 'csv' | 'xlsx' | 'pdf',
    courseId?: string,
    moduleId?: string,
    user?: any,
  ): Promise<any> {
    // Build query
    const query: any = {};

    if (courseId) {
      query.course = new Types.ObjectId(courseId);
    }

    if (moduleId) {
      query.module = new Types.ObjectId(moduleId);
    }

    // Check permissions - filter by instructor if not admin
    if (
      user &&
      user.role !== UserRole.ADMIN &&
      user.role !== UserRole.SUPER_ADMIN
    ) {
      // Get courses where user is instructor
      const instructorCourses = await this.courseModel
        .find({ instructor: new Types.ObjectId(user.id) })
        .select('_id')
        .exec();

      const courseIds = instructorCourses.map((c) => c._id);

      if (courseIds.length === 0) {
        throw new ForbiddenException('No courses found for export');
      }

      query.course = { $in: courseIds };
    }

    // Fetch lessons
    const lessons = await this.lessonModel
      .find(query)
      .populate('course', 'title')
      .populate('module', 'title')
      .sort({ order: 1 })
      .lean()
      .exec();

    // Format data for export
    const exportData = lessons.map((lesson: any) => ({
      Title: lesson.title,
      Type: lesson.type,
      Status: lesson.status,
      Duration: `${Math.floor(lesson.duration / 60)}m ${lesson.duration % 60}s`,
      'Is Free': lesson.isFree ? 'Yes' : 'No',
      Course: lesson.course?.title || 'N/A',
      Module: lesson.module?.title || 'N/A',
      Order: lesson.order,
      'Completion Count': lesson.completionCount || 0,
      'Average Score': lesson.averageScore || 0,
    }));

    if (format === 'csv') {
      // Simple CSV implementation
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(',')];

      for (const row of exportData) {
        const values = headers.map((header) => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }

      return csvRows.join('\n');
    }

    // For xlsx and pdf, return JSON data (client can handle formatting)
    return exportData;
  }

  async getStats(): Promise<any> {
    const totalCourses = await this.courseModel.countDocuments();
    const publishedCourses = await this.courseModel.countDocuments({
      status: CourseStatus.PUBLISHED,
    });
    const totalEnrollments = await this.courseModel.aggregate([
      { $group: { _id: null, total: { $sum: '$studentCount' } } },
    ]);
    const totalRevenue = await this.courseModel.aggregate([
      { $group: { _id: null, total: { $sum: '$totalRevenue' } } },
    ]);

    const topCourses = await this.courseModel
      .find({ status: CourseStatus.PUBLISHED })
      .sort({ totalRevenue: -1 })
      .limit(5)
      .select('title totalRevenue studentCount rating')
      .exec();

    return {
      totalCourses,
      publishedCourses,
      totalEnrollments: totalEnrollments[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      topCourses,
    };
  }

  async incrementEnrollment(
    courseId: string,
    amount: number = 1,
  ): Promise<void> {
    await this.courseModel.findByIdAndUpdate(courseId, {
      $inc: { studentCount: amount, totalEnrollments: amount },
    });
  }

  async addRevenue(courseId: string, amount: number): Promise<void> {
    await this.courseModel.findByIdAndUpdate(courseId, {
      $inc: { totalRevenue: amount },
    });
  }

  async getEnrollmentsByDateRange(dateRange: {
    start: Date;
    end: Date;
  }): Promise<any[]> {
    return await this.courseModel.aggregate([
      {
        $match: {
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: '$studentCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async count(): Promise<number> {
    return await this.courseModel.countDocuments();
  }

  async getEnrollmentsByCountry(): Promise<any[]> {
    return await this.courseModel.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'instructor',
          foreignField: '_id',
          as: 'instructor',
        },
      },
      {
        $unwind: '$instructor',
      },
      {
        $group: {
          _id: '$instructor.country',
          count: { $sum: '$studentCount' },
          revenue: { $sum: '$totalRevenue' },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  async publish(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.findById(id);

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only publish your own courses');
    }

    if (course.status === CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is already published');
    }

    const updated = await this.courseModel
      .findByIdAndUpdate(
        id,
        {
          status: CourseStatus.PUBLISHED,
          isPublished: true,
        },
        { new: true },
      )
      .populate('instructor', 'firstName lastName email avatar')
      .exec();

    if (!updated) {
      throw new NotFoundException('Course not found');
    }

    return updated;
  }

  async unpublish(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.findById(id);

    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only unpublish your own courses');
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Course is not published');
    }

    const updated = await this.courseModel
      .findByIdAndUpdate(
        id,
        {
          status: CourseStatus.DRAFT,
          isPublished: false,
        },
        { new: true },
      )
      .populate('instructor', 'firstName lastName email avatar')
      .exec();

    if (!updated) {
      throw new NotFoundException('Course not found');
    }

    return updated;
  }

  async duplicate(id: string, userId: string): Promise<Course> {
    const originalCourse = await this.findById(id);

    // Check if user is instructor of original course or admin
    if (originalCourse.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only duplicate your own courses');
    }

    // Create slug for duplicate
    const baseSlug = originalCourse.slug;
    let newSlug = `${baseSlug}-copy`;
    let counter = 1;

    // Ensure unique slug
    while (await this.courseModel.findOne({ slug: newSlug })) {
      newSlug = `${baseSlug}-copy-${counter}`;
      counter++;
    }

    // Remove fields that shouldn't be duplicated
    const courseData = originalCourse.toObject();
    delete courseData._id;
    delete courseData.createdAt;
    delete courseData.updatedAt;
    delete courseData.studentCount;
    delete courseData.enrollmentCount;
    delete courseData.rating;
    delete courseData.reviewCount;
    delete courseData.totalRatings;
    delete courseData.totalRevenue;

    // Create new course with modified data
    const duplicatedCourse = new this.courseModel({
      ...courseData,
      title: `${originalCourse.title} (Copy)`,
      slug: newSlug,
      status: CourseStatus.DRAFT,
      isPublished: false,
      isFeatured: false,
    });

    const saved = await duplicatedCourse.save();

    // Duplicate lessons if any
    const lessons = await this.lessonModel.find({
      course: originalCourse._id,
    });

    if (lessons.length > 0) {
      const duplicatedLessons = lessons.map((lesson) => {
        const { _id, createdAt, updatedAt, ...rest } = lesson.toObject() as any;
        return {
          ...rest,
          course: saved._id,
        };
      });

      await this.lessonModel.insertMany(duplicatedLessons);
    }

    const final = await this.courseModel
      .findById(saved._id)
      .populate('instructor', 'firstName lastName email avatar')
      .exec();
    if (!final) {
      throw new NotFoundException('Duplicated course not found');
    }
    return final;
  }

  async toggleStatus(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Course> {
    const course = await this.courseModel.findById(id);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check permissions
    if (
      userRole !== UserRole.SUPER_ADMIN &&
      userRole !== UserRole.ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You do not have permission to toggle this course status',
      );
    }

    const currentStatus = course.status || CourseStatus.DRAFT;
    const newStatus =
      currentStatus === CourseStatus.PUBLISHED
        ? CourseStatus.DRAFT
        : CourseStatus.PUBLISHED;

    course.status = newStatus;
    return await course.save();
  }

  async bulkDelete(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ deleted: number }> {
    let deleted = 0;

    for (const id of ids) {
      try {
        const course = await this.courseModel.findById(id);
        if (!course) continue;

        // Check permissions
        if (
          userRole !== UserRole.SUPER_ADMIN &&
          userRole !== UserRole.ADMIN &&
          course.instructor.toString() !== userId
        ) {
          continue; // Skip courses user doesn't have permission to delete
        }

        await this.courseModel.findByIdAndDelete(id);
        deleted++;
      } catch (error) {
        // Continue with other courses even if one fails
        console.error(`Failed to delete course ${id}:`, error);
      }
    }

    return { deleted };
  }

  async bulkToggleStatus(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ updated: number }> {
    let updated = 0;

    for (const id of ids) {
      try {
        const course = await this.courseModel.findById(id);
        if (!course) continue;

        // Check permissions
        if (
          userRole !== UserRole.SUPER_ADMIN &&
          userRole !== UserRole.ADMIN &&
          course.instructor.toString() !== userId
        ) {
          continue; // Skip courses user doesn't have permission to update
        }

        const currentStatus = course.status || CourseStatus.DRAFT;
        const newStatus =
          currentStatus === CourseStatus.PUBLISHED
            ? CourseStatus.DRAFT
            : CourseStatus.PUBLISHED;

        course.status = newStatus;
        await course.save();
        updated++;
      } catch (error) {
        // Continue with other courses even if one fails
        console.error(`Failed to toggle status for course ${id}:`, error);
      }
    }

    return { updated };
  }

  async bulkPublish(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ published: number }> {
    let published = 0;

    for (const id of ids) {
      try {
        const course = await this.courseModel.findById(id);
        if (!course) continue;

        // Check permissions
        if (
          userRole !== UserRole.SUPER_ADMIN &&
          userRole !== UserRole.ADMIN &&
          course.instructor.toString() !== userId
        ) {
          continue; // Skip courses user doesn't have permission to publish
        }

        course.status = CourseStatus.PUBLISHED;
        await course.save();
        published++;
      } catch (error) {
        // Continue with other courses even if one fails
        console.error(`Failed to publish course ${id}:`, error);
      }
    }

    return { published };
  }

  async bulkUnpublish(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ unpublished: number }> {
    let unpublished = 0;

    for (const id of ids) {
      try {
        const course = await this.courseModel.findById(id);
        if (!course) continue;

        // Check permissions
        if (
          userRole !== UserRole.SUPER_ADMIN &&
          userRole !== UserRole.ADMIN &&
          course.instructor.toString() !== userId
        ) {
          continue; // Skip courses user doesn't have permission to unpublish
        }

        course.status = CourseStatus.DRAFT;
        await course.save();
        unpublished++;
      } catch (error) {
        // Continue with other courses even if one fails
        console.error(`Failed to unpublish course ${id}:`, error);
      }
    }

    return { unpublished };
  }

  async exportCourses(
    format: 'csv' | 'xlsx' | 'pdf',
    status?: string,
    category?: string,
    user?: any,
  ): Promise<any> {
    // Build query based on filters
    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (category) {
      query.categories = { $in: [category] };
    }

    // If not admin/super_admin, only show their own courses
    if (user && user.role === UserRole.INSTRUCTOR) {
      query.instructor = new Types.ObjectId(user.id);
    }

    const courses = await this.courseModel
      .find(query)
      .populate('instructor', 'firstName lastName email')
      .lean();

    if (format === 'csv') {
      const headers = [
        'Title',
        'Slug',
        'Instructor',
        'Level',
        'Type',
        'Price',
        'Status',
        'Students',
        'Rating',
        'Created At',
      ];
      const rows = courses.map((c: any) => [
        c.title,
        c.slug,
        c.instructor
          ? `${c.instructor.firstName || ''} ${c.instructor.lastName || ''}`.trim()
          : 'N/A',
        c.level,
        c.type,
        c.price,
        c.status,
        c.studentCount || 0,
        c.rating || 0,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
      ]);

      return {
        data: [headers, ...rows].map((row) => row.join(',')).join('\n'),
        contentType: 'text/csv',
        filename: `courses-${Date.now()}.csv`,
      };
    } else if (format === 'xlsx') {
      // Return structured data for XLSX generation (frontend will handle with libraries like xlsx)
      return {
        data: courses.map((c: any) => ({
          Title: c.title,
          Slug: c.slug,
          Instructor: c.instructor
            ? `${c.instructor.firstName || ''} ${c.instructor.lastName || ''}`.trim()
            : 'N/A',
          Level: c.level,
          Type: c.type,
          Price: c.price,
          Status: c.status,
          Students: c.studentCount || 0,
          Rating: c.rating || 0,
          'Created At': c.createdAt
            ? new Date(c.createdAt).toLocaleDateString()
            : 'N/A',
        })),
        contentType: 'application/json',
        filename: `courses-${Date.now()}.xlsx`,
      };
    } else if (format === 'pdf') {
      // Return structured data for PDF generation (frontend will handle with libraries like jsPDF)
      return {
        data: courses.map((c: any) => ({
          title: c.title,
          slug: c.slug,
          instructor: c.instructor
            ? `${c.instructor.firstName || ''} ${c.instructor.lastName || ''}`.trim()
            : 'N/A',
          level: c.level,
          type: c.type,
          price: c.price,
          status: c.status,
          students: c.studentCount || 0,
          rating: c.rating || 0,
          createdAt: c.createdAt
            ? new Date(c.createdAt).toLocaleDateString()
            : 'N/A',
        })),
        contentType: 'application/json',
        filename: `courses-${Date.now()}.pdf`,
      };
    }

    throw new BadRequestException('Invalid export format');
  }

  async getCourseAnalytics(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const course = await this.findById(courseId);

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only view analytics for your own courses',
      );
    }

    const lessons = await this.lessonModel.find({ course: courseId });

    const analytics = {
      courseId: course._id,
      title: course.title,
      totalStudents: course.studentCount || 0,
      totalRevenue: (course.price || 0) * (course.studentCount || 0),
      completionRate: course.completionRate || 0,
      averageRating: course.rating || 0,
      totalReviews: course.reviewCount || 0,
      totalLessons: lessons.length,
      publishedLessons: lessons.filter((l) => l.status === 'published').length,
      totalDuration: lessons.reduce((sum, l) => sum + (l.duration || 0), 0),
      avgDuration:
        lessons.length > 0
          ? Math.round(
              lessons.reduce((sum, l) => sum + (l.duration || 0), 0) /
                lessons.length,
            )
          : 0,
      lessonsByType: {
        video: lessons.filter((l) => l.type === 'video').length,
        text: lessons.filter((l) => l.type === 'text').length,
        quiz: lessons.filter((l) => l.type === 'quiz').length,
        assignment: lessons.filter((l) => l.type === 'assignment').length,
      },
      totalCompletions: lessons.reduce(
        (sum, l) => sum + (l.completionCount || 0),
        0,
      ),
      avgCompletionRate:
        lessons.length > 0
          ? Math.round(
              lessons.reduce((sum, l) => sum + (l.completionCount || 0), 0) /
                lessons.length,
            )
          : 0,
      enrollmentTrend: [], // Placeholder for time-series data
      revenueByMonth: [], // Placeholder for revenue trends
      studentEngagement: {
        active: 0, // Placeholder
        completed: 0,
        dropped: 0,
      },
    };

    return analytics;
  }

  async getLessonAnalytics(
    lessonId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const lesson = await this.lessonModel
      .findById(lessonId)
      .populate('course')
      .exec();

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const course = lesson.course as Course;

    // Check permissions
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException(
        'You can only view analytics for lessons in your own courses',
      );
    }

    // Return basic analytics (can be enhanced with real tracking data)
    return {
      lessonId: lesson._id,
      title: lesson.title,
      type: lesson.type,
      status: lesson.status,
      views: lesson.completionCount || 0,
      completions: lesson.completionCount || 0,
      averageProgress: 0, // Would need a separate tracking collection
      averageTimeSpent: lesson.duration || 0,
      averageScore: lesson.averageScore || 0,
      lastAccessed: new Date(),
    };
  }

  async getPreview(courseId: string): Promise<any> {
    const course = await this.courseModel
      .findById(courseId)
      .populate('instructor', 'firstName lastName avatar email')
      .lean();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get free lessons only for preview
    const freeLessons = await this.lessonModel
      .find({
        course: new Types.ObjectId(courseId),
        isFree: true,
        status: 'published',
      })
      .select('title description duration type position videoUrl thumbnail')
      .lean();

    return {
      ...course,
      previewLessons: freeLessons,
      totalLessons: await this.lessonModel.countDocuments({
        course: new Types.ObjectId(courseId),
      }),
    };
  }
}
