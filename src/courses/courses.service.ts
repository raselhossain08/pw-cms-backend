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

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    instructorId: string,
  ): Promise<Course> {
    console.log(
      'Creating course with DTO:',
      JSON.stringify(createCourseDto, null, 2),
    );
    console.log('Thumbnail URL:', createCourseDto.thumbnail);

    const existingCourse = await this.courseModel.findOne({
      slug: createCourseDto.slug,
    });
    if (existingCourse) {
      throw new ConflictException('Course with this slug already exists');
    }

    const duration =
      (createCourseDto as any).duration ?? createCourseDto.durationHours;
    const course = new this.courseModel({
      ...createCourseDto,
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

    // Convert _id to id for each course
    const serializedCourses = courses.map((course: any) => ({
      ...course,
      id: course._id.toString(),
      _id: course._id.toString(),
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
      .exec();

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findBySlug(slug: string): Promise<Course> {
    const course = await this.courseModel
      .findOne({ slug, status: CourseStatus.PUBLISHED })
      .populate(
        'instructor',
        'firstName lastName email avatar bio certifications flightHours',
      )
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
    console.log(
      'Updating course with DTO:',
      JSON.stringify(updateCourseDto, null, 2),
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

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, updateCourseDto, { new: true })
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
    return await this.courseModel
      .find({
        status: CourseStatus.PUBLISHED,
        isFeatured: true,
      })
      .populate('instructor', 'firstName lastName email avatar')
      .sort({ rating: -1, studentCount: -1 })
      .limit(limit)
      .exec();
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
  ): Promise<Lesson> {
    const course = await this.findById(courseId);

    if (course.instructor.toString() !== instructorId) {
      throw new ForbiddenException(
        'You can only add lessons to your own courses',
      );
    }

    const existingLesson = await this.lessonModel.findOne({
      course: courseId,
      slug: createLessonDto.slug,
    });
    if (existingLesson) {
      throw new ConflictException(
        'Lesson with this slug already exists in this course',
      );
    }

    const lesson = new this.lessonModel({
      ...createLessonDto,
      course: courseId,
    });

    return await lesson.save();
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

    return await this.lessonModel.find(query).sort({ order: 1 }).exec();
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

    const updatedLesson = await this.lessonModel.findByIdAndUpdate(
      lessonId,
      updateData,
      { new: true },
    );

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
    const lessons = await this.lessonModel
      .find({ _id: { $in: lessonIds }, course: courseId })
      .select('_id')
      .exec();
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
}
