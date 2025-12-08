import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { CourseModule } from './entities/module.entity'
import { Course } from '../courses/entities/course.entity'
import { Lesson } from '../courses/entities/lesson.entity'
import { UserRole } from '../users/entities/user.entity'
import { Quiz } from '../quizzes/entities/quiz.entity'
import { Assignment } from '../certificates/entities/additional.entity'

@Injectable()
export class ModulesService {
  constructor(
    @InjectModel(CourseModule.name) private moduleModel: Model<CourseModule>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
  ) {}

  async create(courseId: string, data: { title: string; description?: string; status?: string; order?: number; duration?: number }, userId: string, userRole: UserRole): Promise<CourseModule> {
    const course = await this.courseModel.findById(courseId)
    if (!course) throw new NotFoundException('Course not found')
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only manage modules in your own courses')
    }

    const maxOrder = await this.moduleModel.find({ course: courseId }).sort({ order: -1 }).limit(1)
    const order = typeof data.order === 'number' ? data.order : (maxOrder[0]?.order || 0) + 1

    const moduleDoc = new this.moduleModel({
      title: data.title,
      description: data.description,
      status: data.status || 'draft',
      order,
      duration: data.duration || 0,
      course: new Types.ObjectId(courseId),
    })
    return await moduleDoc.save()
  }

  async findAll(params: { courseId?: string; page?: number; limit?: number; search?: string }): Promise<{ modules: CourseModule[]; total: number }> {
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit
    const query: any = {}
    if (params.courseId && Types.ObjectId.isValid(params.courseId)) {
      query.course = new Types.ObjectId(params.courseId)
    }
    if (params.search) {
      query.title = { $regex: params.search, $options: 'i' }
    }
    const [modules, total] = await Promise.all([
      this.moduleModel.find(query).sort({ course: 1, order: 1 }).skip(skip).limit(limit).exec(),
      this.moduleModel.countDocuments(query),
    ])
    return { modules, total }
  }

  async findById(id: string): Promise<CourseModule> {
    const moduleDoc = await this.moduleModel.findById(id).exec()
    if (!moduleDoc) throw new NotFoundException('Module not found')
    return moduleDoc
  }

  async update(id: string, data: Partial<CourseModule>, userId: string, userRole: UserRole): Promise<CourseModule> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    const course = await this.courseModel.findById(moduleDoc.course as any)
    if (!course) throw new NotFoundException('Course not found')
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only update modules in your own courses')
    }
    Object.assign(moduleDoc, data)
    return await moduleDoc.save()
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    const course = await this.courseModel.findById(moduleDoc.course as any)
    if (!course) throw new NotFoundException('Course not found')
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only delete modules in your own courses')
    }
    const lessonsInModule = await this.lessonModel.countDocuments({ module: moduleDoc._id })
    if (lessonsInModule > 0) {
      throw new BadRequestException('Module contains lessons; move or delete lessons first')
    }
    await this.moduleModel.findByIdAndDelete(id)
  }

  async duplicate(id: string, userId: string, userRole: UserRole): Promise<CourseModule> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    const course = await this.courseModel.findById(moduleDoc.course as any)
    if (!course) throw new NotFoundException('Course not found')
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only duplicate modules in your own courses')
    }
    const maxOrder = await this.moduleModel.find({ course: moduleDoc.course }).sort({ order: -1 }).limit(1)
    const newModule = new this.moduleModel({
      title: moduleDoc.title + ' (Copy)',
      description: moduleDoc.description,
      status: moduleDoc.status,
      order: (maxOrder[0]?.order || 0) + 1,
      duration: moduleDoc.duration,
      course: moduleDoc.course,
    })
    const saved = await newModule.save()
    const lessons = await this.lessonModel.find({ module: moduleDoc._id })
    if (lessons.length) {
      const duplicates = lessons.map((l) => {
        const o: any = l.toObject()
        delete o._id
        o.module = saved._id
        o.course = moduleDoc.course
        return o
      })
      await (this.lessonModel as any).insertMany(duplicates)
    }
    return saved
  }

  async getLessons(id: string): Promise<Lesson[]> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    return await this.lessonModel.find({ module: moduleDoc._id }).sort({ order: 1 }).exec()
  }

  async reorderLessons(id: string, lessonIds: string[], userId: string, userRole: UserRole): Promise<{ message: string }> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    const course = await this.courseModel.findById(moduleDoc.course as any)
    if (!course) throw new NotFoundException('Course not found')
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN && course.instructor.toString() !== userId) {
      throw new ForbiddenException('You can only reorder modules in your own courses')
    }
    const lessons = await this.lessonModel.find({ _id: { $in: lessonIds }, module: moduleDoc._id }).select('_id')
    const foundIds = new Set(lessons.map((l) => (l._id as any).toString()))
    for (const idItem of lessonIds) {
      if (!foundIds.has(idItem)) {
        throw new BadRequestException('Invalid lesson IDs for this module')
      }
    }
    const bulk = lessonIds.map((idItem, idx) => ({
      updateOne: { filter: { _id: idItem }, update: { $set: { order: idx + 1 } } },
    }))
    await (this.lessonModel as any).bulkWrite(bulk)
    return { message: 'Lessons reordered' }
  }

  async getModuleContent(id: string): Promise<{ module: any; lessons: any[]; assignments: any[]; quizzes: any[] }> {
    const moduleDoc = await this.moduleModel.findById(id)
    if (!moduleDoc) throw new NotFoundException('Module not found')
    const lessons = await this.lessonModel.find({ module: moduleDoc._id }).sort({ order: 1 }).lean().exec()
    const assignments = await this.assignmentModel.find({ course: moduleDoc.course }).lean().exec()
    const quizzes = await this.quizModel.find({ course: moduleDoc.course }).lean().exec()
    return { module: moduleDoc.toObject(), lessons, assignments, quizzes }
  }
}
