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

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    @InjectModel(AssignmentSubmission.name)
    private submissionModel: Model<AssignmentSubmission>,
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
    },
  ): Promise<Assignment> {
    const assignment = new this.assignmentModel({
      course: courseId,
      instructor: instructorId,
      ...data,
    });

    return await assignment.save();
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
    const skip = (page - 1) * limit;

    const filter: any = { student: studentId };

    if (courseId) {
      const assignments = await this.assignmentModel
        .find({ course: courseId })
        .select('_id');
      filter.assignment = { $in: assignments.map((a) => a._id) };
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
}
