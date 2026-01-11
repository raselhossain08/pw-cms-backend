import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CourseModule,
  CourseModuleStatus,
} from './entities/course-module.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { Course } from '../courses/entities/course.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CourseModulesService {
  constructor(
    @InjectModel(CourseModule.name) private moduleModel: Model<CourseModule>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
  ) {}

  async create(
    dto: CreateCourseModuleDto,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseModule> {
    const course = await this.courseModel.findById(dto.courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }

    // If order not provided, get the next order number
    let order = dto.order;
    if (!order) {
      const existingModules = await this.moduleModel.find({
        course: dto.courseId,
      });
      order = existingModules.length + 1;
    }

    // Handle multiple courses support
    const coursesArray = dto.courseIds
      ? dto.courseIds.map((id) => new Types.ObjectId(id))
      : [new Types.ObjectId(dto.courseId)];

    const module = new this.moduleModel({
      title: dto.title,
      description: dto.description,
      duration: dto.duration || 0,
      order: order,
      status: dto.status || 'published',
      course: new Types.ObjectId(dto.courseId),
      courses: coursesArray,
    });
    const savedModule = await module.save();

    // Add module to course's modules array
    await this.courseModel.findByIdAndUpdate(
      dto.courseId,
      { $addToSet: { modules: savedModule._id } },
      { new: true },
    );

    // If there are additional courses, add the module to them as well
    if (dto.courseIds && dto.courseIds.length > 1) {
      const additionalCourseIds = dto.courseIds.filter(
        (id) => id !== dto.courseId,
      );
      for (const courseId of additionalCourseIds) {
        await this.courseModel.findByIdAndUpdate(
          courseId,
          { $addToSet: { modules: savedModule._id } },
          { new: true },
        );
      }
    }

    return savedModule;
  }

  async findAll(
    page = 1,
    limit = 20,
    courseId?: string,
  ): Promise<{ modules: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (courseId) query.course = new Types.ObjectId(courseId);

    const [modules, total] = await Promise.all([
      this.moduleModel
        .find(query)
        .populate('course', 'title instructor')
        .populate('courses', 'title instructor')
        .sort({ course: 1, order: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.moduleModel.countDocuments(query),
    ]);

    const withCounts = await Promise.all(
      modules.map(async (m: any) => {
        const lessonCount = await this.lessonModel.countDocuments({
          module: m._id,
        });
        return { ...m, id: m._id.toString(), lessonsCount: lessonCount };
      }),
    );

    return { modules: withCounts, total };
  }

  async findByCourse(courseId: string): Promise<any[]> {
    const modules = await this.moduleModel
      .find({ course: courseId })
      .sort({ order: 1 })
      .lean();
    return modules.map((m: any) => ({ ...m, id: m._id.toString() }));
  }

  async findOne(id: string): Promise<CourseModule> {
    const module = await this.moduleModel
      .findById(id)
      .populate('course', 'title instructor');
    if (!module) throw new NotFoundException('Module not found');
    return module as any;
  }

  async update(
    id: string,
    dto: UpdateCourseModuleDto,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseModule> {
    const module = await this.moduleModel.findById(id).populate('course');
    if (!module) throw new NotFoundException('Module not found');
    const course: any = module.course;
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }

    // Transform courseId to course field for Mongoose
    const updateData: any = { ...dto };

    if (dto.courseId) {
      const courseIdObj = new Types.ObjectId(dto.courseId);
      updateData.course = courseIdObj;

      // Handle courseIds if provided (for multi-course modules)
      if ((dto as any).courseIds && Array.isArray((dto as any).courseIds)) {
        const courseIdsObjs = (dto as any).courseIds.map(
          (cid: string) => new Types.ObjectId(cid),
        );
        updateData.courses = courseIdsObjs;

        // Update all affected courses' modules arrays
        const oldCourseIds = (module.courses || []).map((c) => c.toString());
        const newCourseIds = (dto as any).courseIds;

        // Remove module from courses it no longer belongs to
        const coursesToRemove = oldCourseIds.filter(
          (oid: string) => !newCourseIds.includes(oid),
        );
        for (const courseId of coursesToRemove) {
          await this.courseModel.findByIdAndUpdate(
            courseId,
            { $pull: { modules: module._id } },
            { new: true },
          );
        }

        // Add module to new courses
        const coursesToAdd = newCourseIds.filter(
          (nid: string) => !oldCourseIds.includes(nid),
        );
        for (const courseId of coursesToAdd) {
          await this.courseModel.findByIdAndUpdate(
            courseId,
            { $addToSet: { modules: module._id } },
            { new: true },
          );
        }
      } else {
        // Add to courses array if not already present
        const existingCourses = module.courses || [];
        if (!existingCourses.some((c) => c.toString() === dto.courseId)) {
          updateData.courses = [...existingCourses, courseIdObj];

          // Add module to the new course
          await this.courseModel.findByIdAndUpdate(
            dto.courseId,
            { $addToSet: { modules: module._id } },
            { new: true },
          );
        }
      }

      delete updateData.courseId;
      delete updateData.courseIds;
    }

    const updated = await this.moduleModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
      })
      .populate('course', 'title instructor')
      .populate('courses', 'title instructor');
    if (!updated) throw new NotFoundException('Module not found');
    return updated;
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const module = await this.moduleModel.findById(id).populate('course');
    if (!module) throw new NotFoundException('Module not found');
    const course: any = module.course;
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }
    await this.moduleModel.findByIdAndDelete(id);
  }

  async reorder(
    courseId: string,
    moduleIds: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ message: string }> {
    const course = await this.courseModel.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }
    const modules = await this.moduleModel
      .find({ _id: { $in: moduleIds }, course: courseId })
      .select('_id')
      .lean();
    const foundIds = new Set(modules.map((m) => (m._id as any).toString()));
    for (const id of moduleIds) {
      if (!foundIds.has(id))
        throw new BadRequestException('Invalid module IDs for this course');
    }
    const bulk = moduleIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order: index + 1 } },
      },
    }));
    await (this.moduleModel as any).bulkWrite(bulk);
    return { message: 'Modules reordered' };
  }

  async getModuleLessons(
    moduleId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any[]> {
    const module = await this.moduleModel.findById(moduleId).populate('course');
    if (!module) throw new NotFoundException('Module not found');
    const course: any = module.course;
    const query: any = { module: moduleId };
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      query.status = 'published';
    }
    return this.lessonModel.find(query).sort({ order: 1 }).lean().exec();
  }

  async toggleStatus(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseModule> {
    const module = await this.moduleModel.findById(id).populate('course');
    if (!module) throw new NotFoundException('Module not found');
    const course: any = module.course;
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }

    const currentStatus = module.status || 'draft';
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';

    module.status = newStatus as any;
    return await module.save();
  }

  async duplicate(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<CourseModule> {
    const originalModule = await this.moduleModel
      .findById(id)
      .populate('course');
    if (!originalModule) throw new NotFoundException('Module not found');
    const course: any = originalModule.course;
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      !course.instructors.map(id => id.toString()).includes(userId)
    ) {
      throw new ForbiddenException('You can only duplicate your own modules');
    }

    const duplicatedData: any = originalModule.toObject();
    delete duplicatedData._id;
    delete duplicatedData.createdAt;
    delete duplicatedData.updatedAt;

    duplicatedData.title = `${originalModule.title} (Copy)`;
    duplicatedData.status = CourseModuleStatus.DRAFT;

    // Get the next order for the course
    const courseModules = await this.moduleModel.find({ course: course._id });
    duplicatedData.order = courseModules.length + 1;

    const duplicatedModule = new this.moduleModel(duplicatedData);
    return await duplicatedModule.save();
  }

  async bulkDelete(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ deleted: number }> {
    const modules = await this.moduleModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .populate('course');

    if (modules.length === 0) {
      throw new NotFoundException('No modules found to delete');
    }

    // Check permissions
    for (const module of modules) {
      const course: any = module.course;
      if (
        userRole !== UserRole.ADMIN &&
        userRole !== UserRole.SUPER_ADMIN &&
        !course.instructors.map(id => id.toString()).includes(userId)
      ) {
        throw new ForbiddenException('You can only delete your own modules');
      }
    }

    await this.moduleModel.deleteMany({
      _id: { $in: modules.map((m) => m._id) },
    });

    return { deleted: modules.length };
  }

  async bulkToggleStatus(
    ids: string[],
    userId: string,
    userRole: UserRole,
  ): Promise<{ updated: number }> {
    const modules = await this.moduleModel
      .find({ _id: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .populate('course');

    if (modules.length === 0) {
      throw new NotFoundException('No modules found to update');
    }

    // Check permissions
    for (const module of modules) {
      const course: any = module.course;
      if (
        userRole !== UserRole.ADMIN &&
        userRole !== UserRole.SUPER_ADMIN &&
        !course.instructors.map(id => id.toString()).includes(userId)
      ) {
        throw new ForbiddenException('You can only update your own modules');
      }
    }

    // Toggle status for all modules
    const bulkOps = modules.map((module) => {
      const currentStatus = module.status || 'draft';
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      return {
        updateOne: {
          filter: { _id: module._id },
          update: { $set: { status: newStatus } },
        },
      };
    });

    await (this.moduleModel as any).bulkWrite(bulkOps);

    return { updated: modules.length };
  }

  async getModuleStats(moduleId: string): Promise<any> {
    const module = await this.moduleModel.findById(moduleId).populate('course');
    if (!module) throw new NotFoundException('Module not found');

    const lessonCount = await this.lessonModel.countDocuments({
      module: moduleId,
    });
    const publishedLessons = await this.lessonModel.countDocuments({
      module: moduleId,
      status: 'published',
    });

    // Get course enrollment count
    const course: any = module.course;
    const { Enrollment } = await import(
      '../enrollments/entities/enrollment.entity'
    );
    const enrollmentModel = this.moduleModel.db.model('Enrollment');
    const enrolledStudents = await enrollmentModel.countDocuments({
      course: course._id,
      status: 'active',
    });

    return {
      totalModules: 1,
      totalLessons: lessonCount,
      publishedLessons,
      averageCompletion:
        publishedLessons > 0
          ? Math.round((publishedLessons / lessonCount) * 100)
          : 0,
      totalStudents: enrolledStudents,
      publishedModules: module.status === 'published' ? 1 : 0,
      draftModules: module.status === 'draft' ? 1 : 0,
    };
  }

  async exportModules(
    format: 'csv' | 'xlsx' | 'pdf',
    courseId: string | undefined,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const query: any = {};
    if (courseId) query.course = new Types.ObjectId(courseId);

    const modules = await this.moduleModel
      .find(query)
      .populate('course', 'title instructor')
      .populate('courses', 'title instructor')
      .sort({ course: 1, order: 1 })
      .lean()
      .exec();

    // Add lesson counts
    const withCounts = await Promise.all(
      modules.map(async (m: any) => {
        const lessonCount = await this.lessonModel.countDocuments({
          module: m._id,
        });
        return {
          ...m,
          id: m._id.toString(),
          lessonsCount: lessonCount,
          courseTitle: m.course?.title || 'N/A',
        };
      }),
    );

    // For now, return the data - actual export implementation would use libraries like csv-writer, xlsx, pdfkit
    return {
      format,
      data: withCounts,
      message: `Export in ${format.toUpperCase()} format - implementation pending`,
    };
  }

  async searchModules(params: {
    query?: string;
    status?: string;
    courseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ modules: any[]; total: number }> {
    const { query, status, courseId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const searchQuery: any = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      searchQuery.status = status;
    }

    // Course filter
    if (courseId) {
      searchQuery.course = new Types.ObjectId(courseId);
    }

    const [modules, total] = await Promise.all([
      this.moduleModel
        .find(searchQuery)
        .populate('course', 'title instructor')
        .populate('courses', 'title instructor')
        .sort({ course: 1, order: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.moduleModel.countDocuments(searchQuery),
    ]);

    const withCounts = await Promise.all(
      modules.map(async (m: any) => {
        const lessonCount = await this.lessonModel.countDocuments({
          module: m._id,
        });
        return { ...m, id: m._id.toString(), lessonsCount: lessonCount };
      }),
    );

    return { modules: withCounts, total };
  }
}
