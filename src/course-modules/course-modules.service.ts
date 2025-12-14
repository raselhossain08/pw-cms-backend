import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseModule } from './entities/course-module.entity';
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
  ) { }

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
      if (!existingCourses.some(c => c.toString() === dto.courseId)) {
        updateData.courses = [...existingCourses, courseIdObj];
      }

      delete updateData.courseId;
    }

    const updated = await this.moduleModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate('course', 'title instructor').populate('courses', 'title instructor');
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
}
