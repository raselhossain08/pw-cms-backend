import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Assignment,
  AssignmentSubmission,
} from '../certificates/entities/additional.entity';
import { Lesson } from '../courses/entities/lesson.entity';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    @InjectModel(AssignmentSubmission.name)
    private submissionModel: Model<AssignmentSubmission>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
  ) {}

  async create(
    courseId: string,
    instructorId: string,
    data: {
      title: string;
      description: string;
      dueDate: Date;
      maxPoints?: number;
      attachments?: string[];
      moduleId?: string;
      lessonId?: string;
    },
  ): Promise<Assignment> {
    const payload: any = {
      course: courseId,
      instructor: instructorId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      maxPoints: data.maxPoints,
      attachments: data.attachments || [],
    };
    if (data.moduleId) payload.module = new Types.ObjectId(data.moduleId);
    if (data.lessonId) payload.lesson = new Types.ObjectId(data.lessonId);
    const assignment = new this.assignmentModel(payload);

    const savedAssignment = await assignment.save();

    // Automatically create a lesson of type ASSIGNMENT if moduleId is provided
    if (data.moduleId) {
      // Generate slug from assignment title
      const slug = data.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      // Check for existing lesson with same slug
      let finalSlug = slug;
      const existingLesson = await this.lessonModel.findOne({
        course: courseId,
        slug: finalSlug,
      });
      if (existingLesson) {
        finalSlug = `${slug}-${Date.now()}`;
      }

      // Get the order for the new lesson within the module
      const lessonCount = await this.lessonModel.countDocuments({
        course: courseId,
        module: new Types.ObjectId(data.moduleId),
      });

      // Create the lesson
      const lesson = new this.lessonModel({
        title: data.title,
        slug: finalSlug,
        description: data.description || '',
        type: 'assignment',
        status: 'published',
        order: lessonCount + 1,
        course: new Types.ObjectId(courseId),
        module: new Types.ObjectId(data.moduleId),
        duration: 0,
        isFree: false,
      });

      await lesson.save();

      // Update the assignment with the lesson reference
      savedAssignment.lesson = lesson._id as Types.ObjectId;
      await savedAssignment.save();
    }

    return savedAssignment;
  }

  async getCourseAssignments(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ assignments: Assignment[]; total: number }> {
    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      this.assignmentModel
        .find({ course: courseId })
        .populate('instructor', 'firstName lastName')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.assignmentModel.countDocuments({ course: courseId }),
    ]);

    return { assignments, total };
  }

  async getAssignment(id: string): Promise<Assignment> {
    const assignment = await this.assignmentModel
      .findById(id)
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName');

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async update(
    id: string,
    instructorId: string,
    data: Partial<Assignment>,
  ): Promise<Assignment> {
    const assignment = await this.assignmentModel.findById(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only update your own assignments');
    }

    Object.assign(assignment, data);
    return await assignment.save();
  }

  async delete(id: string, instructorId: string): Promise<void> {
    const assignment = await this.assignmentModel.findById(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only delete your own assignments');
    }

    await Promise.all([
      this.assignmentModel.findByIdAndDelete(id),
      this.submissionModel.deleteMany({ assignment: id }),
    ]);
  }

  async submitAssignment(
    assignmentId: string,
    studentId: string,
    data: { content: string; attachments?: string[] },
  ): Promise<AssignmentSubmission> {
    const assignment = await this.assignmentModel.findById(assignmentId);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // Check if already submitted
    const existing = await this.submissionModel.findOne({
      assignment: assignmentId,
      student: studentId,
    });

    if (existing) {
      throw new BadRequestException('Assignment already submitted');
    }

    // Check due date
    if (new Date() > assignment.dueDate) {
      throw new BadRequestException('Assignment deadline has passed');
    }

    const submission = new this.submissionModel({
      assignment: assignmentId,
      student: studentId,
      content: data.content,
      attachments: data.attachments || [],
      submittedAt: new Date(),
    });

    return await submission.save();
  }

  async getSubmission(
    id: string,
    userId: string,
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionModel
      .findById(id)
      .populate('assignment')
      .populate('student', 'firstName lastName email');

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.student['_id'].toString() !== userId) {
      throw new ForbiddenException('Not your submission');
    }

    return submission;
  }

  async getStudentSubmissions(
    studentId: string,
    courseId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ submissions: AssignmentSubmission[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      // Convert studentId to ObjectId
      const studentObjectId = new Types.ObjectId(studentId);
      const filter: any = { student: studentObjectId };

      if (courseId) {
        // Convert courseId to ObjectId
        const courseObjectId = new Types.ObjectId(courseId);
        const assignments = await this.assignmentModel
          .find({ course: courseObjectId })
          .select('_id')
          .lean();

        // Only add assignment filter if assignments exist
        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map((a) => a._id);
          filter.assignment = { $in: assignmentIds };
        } else {
          // If no assignments found for the course, return empty result
          return { submissions: [], total: 0 };
        }
      }

      const [submissions, total] = await Promise.all([
        this.submissionModel
          .find(filter)
          .populate('assignment', 'title dueDate maxPoints')
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.submissionModel.countDocuments(filter),
      ]);

      return { submissions, total };
    } catch (error) {
      console.error('Error in getStudentSubmissions:', error);
      throw new BadRequestException(
        `Failed to retrieve student submissions: ${error.message}`,
      );
    }
  }

  async getAssignmentSubmissions(
    assignmentId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ submissions: AssignmentSubmission[]; total: number }> {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.submissionModel
        .find({ assignment: assignmentId })
        .populate('student', 'firstName lastName email')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.submissionModel.countDocuments({ assignment: assignmentId }),
    ]);

    return { submissions, total };
  }

  async gradeSubmission(
    submissionId: string,
    instructorId: string,
    data: { grade: number; feedback?: string },
  ): Promise<AssignmentSubmission> {
    const submission = await this.submissionModel
      .findById(submissionId)
      .populate('assignment');

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const assignment = submission.assignment as any;
    if (assignment.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only grade your own assignments');
    }

    if (data.grade > assignment.maxPoints) {
      throw new BadRequestException(
        `Grade cannot exceed ${assignment.maxPoints} points`,
      );
    }

    submission.grade = data.grade;
    submission.feedback = data.feedback;
    submission.gradedAt = new Date();

    return await submission.save();
  }

  async getAssignmentStats(assignmentId: string): Promise<any> {
    const [totalSubmissions, gradedSubmissions, assignment] = await Promise.all(
      [
        this.submissionModel.countDocuments({ assignment: assignmentId }),
        this.submissionModel.countDocuments({
          assignment: assignmentId,
          grade: { $exists: true },
        }),
        this.assignmentModel.findById(assignmentId),
      ],
    );

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const submissions = await this.submissionModel.find({
      assignment: assignmentId,
      grade: { $exists: true },
    });

    const averageGrade =
      submissions.length > 0
        ? submissions.reduce((sum, s) => sum + (s.grade || 0), 0) /
          submissions.length
        : 0;

    return {
      totalSubmissions,
      gradedSubmissions,
      pendingGrading: totalSubmissions - gradedSubmissions,
      averageGrade: Math.round(averageGrade * 100) / 100,
      maxPoints: assignment.maxPoints,
    };
  }

  async toggleStatus(id: string, instructorId: string): Promise<Assignment> {
    const assignment = await this.assignmentModel.findById(id);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only toggle your own assignments');
    }

    // Toggle isActive if it exists, otherwise toggle a status field
    if ('isActive' in assignment) {
      (assignment as any).isActive = !(assignment as any).isActive;
    } else {
      // If no isActive field, you might want to add a status field
      // For now, we'll just return the assignment as-is
    }

    return await assignment.save();
  }

  async duplicate(id: string, instructorId: string): Promise<Assignment> {
    const original = await this.assignmentModel.findById(id);

    if (!original) {
      throw new NotFoundException('Assignment not found');
    }

    if (original.instructor.toString() !== instructorId) {
      throw new ForbiddenException(
        'You can only duplicate your own assignments',
      );
    }

    // Create duplicate with modified title and new due date (7 days from now)
    const duplicated = new this.assignmentModel({
      course: original.course,
      instructor: original.instructor,
      title: `${original.title} (Copy)`,
      description: original.description,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      maxPoints: original.maxPoints,
      attachments: original.attachments || [],
      module: original.module,
      lesson: original.lesson,
    });

    return await duplicated.save();
  }

  async bulkDelete(
    ids: string[],
    instructorId: string,
  ): Promise<{ deleted: number }> {
    let deleted = 0;

    for (const id of ids) {
      try {
        const assignment = await this.assignmentModel.findById(id);
        if (!assignment) continue;

        // Check permissions
        if (assignment.instructor.toString() !== instructorId) {
          continue; // Skip assignments user doesn't have permission to delete
        }

        await Promise.all([
          this.assignmentModel.findByIdAndDelete(id),
          this.submissionModel.deleteMany({ assignment: id }),
        ]);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete assignment ${id}:`, error);
      }
    }

    return { deleted };
  }

  async bulkToggleStatus(
    ids: string[],
    instructorId: string,
  ): Promise<{ updated: number }> {
    let updated = 0;

    for (const id of ids) {
      try {
        const assignment = await this.assignmentModel.findById(id);
        if (!assignment) continue;

        // Check permissions
        if (assignment.instructor.toString() !== instructorId) {
          continue; // Skip assignments user doesn't have permission to update
        }

        if ('isActive' in assignment) {
          (assignment as any).isActive = !(assignment as any).isActive;
          await assignment.save();
          updated++;
        }
      } catch (error) {
        console.error(`Failed to toggle status for assignment ${id}:`, error);
      }
    }

    return { updated };
  }
}
