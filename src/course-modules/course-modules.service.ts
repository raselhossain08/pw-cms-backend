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
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }

    const module = new this.moduleModel({
      title: dto.title,
      description: dto.description,
      duration: dto.duration || 0,
      order: dto.order,
      course: new Types.ObjectId(dto.courseId),
    });
    return module.save();
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
      course.instructor.toString() !== userId
    ) {
      throw new ForbiddenException('You can only modify your own courses');
    }

    // Transform courseId to course field for Mongoose
    const updateData: any = { ...dto };
    if (dto.courseId) {
      const courseIdObj = new Types.ObjectId(dto.courseId);
      updateData.course = courseIdObj;

      // Add to courses array if not already present
      const existingCourses = module.courses || [];
      if (!existingCourses.some((c) => c.toString() === dto.courseId)) {
        updateData.courses = [...existingCourses, courseIdObj];
      }

      delete updateData.courseId;
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
      course.instructor.toString() !== userId
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
      course.instructor.toString() !== userId
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
      course.instructor.toString() !== userId
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
      course.instructor.toString() !== userId
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
      course.instructor.toString() !== userId
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
        course.instructor.toString() !== userId
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
        course.instructor.toString() !== userId
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
}
