import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  ExportInstructorsDto,
  InstructorStatus,
} from './dto/instructor-admin.dto';

@Injectable()
export class AdminInstructorsService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Course') private courseModel: Model<any>,
    @InjectModel('Enrollment') private enrollmentModel: Model<any>,
    @InjectModel('Order') private orderModel: Model<any>,
  ) {}

  /**
   * Get overall instructor statistics
   */
  async getOverallStats() {
    // Get all instructors
    const allInstructors = await this.userModel
      .find({ role: 'instructor' })
      .lean();

    const totalInstructors = allInstructors.length;
    const activeInstructors = allInstructors.filter(
      (i: any) => i.status === 'active',
    ).length;
    const pendingInstructors = allInstructors.filter(
      (i: any) => i.status === 'pending',
    ).length;
    const inactiveInstructors = allInstructors.filter(
      (i: any) => i.status === 'inactive',
    ).length;
    const suspendedInstructors = allInstructors.filter(
      (i: any) => i.status === 'suspended',
    ).length;

    // Get all courses
    const allCourses = await this.courseModel.find().lean();
    const totalCourses = allCourses.length;

    // Calculate average rating
    const coursesWithRatings = allCourses.filter((c: any) => c.rating > 0);
    const totalRating = coursesWithRatings.reduce(
      (sum: number, course: any) => sum + (course.rating || 0),
      0,
    );
    const avgRating =
      coursesWithRatings.length > 0
        ? totalRating / coursesWithRatings.length
        : 0;

    // Calculate total students
    const totalStudents = await this.enrollmentModel.countDocuments({
      status: 'active',
    });

    return {
      totalInstructors,
      activeInstructors,
      pendingInstructors,
      inactiveInstructors,
      suspendedInstructors,
      avgRating: parseFloat(avgRating.toFixed(1)),
      totalCourses,
      totalStudents,
    };
  }

  /**
   * Get individual instructor statistics
   */
  async getInstructorStats(instructorId: string) {
    // Verify instructor exists
    const instructor = await this.userModel.findById(instructorId);
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    if (instructor.role !== 'instructor') {
      throw new BadRequestException('User is not an instructor');
    }

    // Get instructor's courses
    const courses = await this.courseModel
      .find({ instructor: instructorId })
      .lean();

    const coursesCount = courses.length;

    // Get enrolled students
    const enrollments = await this.enrollmentModel
      .find({
        course: { $in: courses.map((c: any) => c._id) },
        status: 'active',
      })
      .lean();

    const studentsCount = new Set(
      enrollments.map((e: any) => e.user.toString()),
    ).size;

    // Calculate total revenue
    const orders = await this.orderModel
      .find({
        'items.course': { $in: courses.map((c: any) => c._id) },
        status: 'completed',
      })
      .lean();

    let totalRevenue = 0;
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        if (
          courses.some((c: any) => c._id.toString() === item.course?.toString())
        ) {
          // Assume 70% goes to instructor (adjust as needed)
          totalRevenue += (item.price || 0) * 0.7;
        }
      });
    });

    // Calculate average rating
    const coursesWithRatings = courses.filter((c: any) => c.rating > 0);
    const totalRating = coursesWithRatings.reduce(
      (sum: number, course: any) => sum + (course.rating || 0),
      0,
    );
    const avgRating =
      coursesWithRatings.length > 0
        ? totalRating / coursesWithRatings.length
        : 0;

    // Calculate completion rate
    const completedEnrollments = enrollments.filter(
      (e: any) => e.progress === 100 || e.status === 'completed',
    ).length;
    const completionRate =
      enrollments.length > 0
        ? (completedEnrollments / enrollments.length) * 100
        : 0;

    // Get monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentOrders = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          status: 'completed',
        },
      },
      {
        $unwind: '$items',
      },
      {
        $match: {
          'items.course': {
            $in: courses.map((c: any) => c._id),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: { $multiply: ['$items.price', 0.7] } },
          orders: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const monthlyRevenue = recentOrders.map((item: any) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
      revenue: Math.round(item.revenue * 100) / 100,
      orders: item.orders,
    }));

    return {
      instructor: {
        id: instructor._id,
        name: `${instructor.firstName} ${instructor.lastName}`,
        email: instructor.email,
        status: instructor.status,
      },
      coursesCount,
      studentsCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRating: parseFloat(avgRating.toFixed(1)),
      reviewCount: courses.reduce(
        (sum: number, c: any) => sum + (c.reviewCount || 0),
        0,
      ),
      completionRate: Math.round(completionRate * 100) / 100,
      monthlyRevenue,
    };
  }

  /**
   * Get pending instructors
   */
  async getPendingInstructors(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [instructors, total] = await Promise.all([
      this.userModel
        .find({ role: 'instructor', status: 'pending' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password')
        .lean(),
      this.userModel.countDocuments({ role: 'instructor', status: 'pending' }),
    ]);

    return {
      instructors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Approve instructor
   */
  async approveInstructor(id: string) {
    const instructor = await this.userModel.findById(id);

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    if (instructor.role !== 'instructor') {
      throw new BadRequestException('User is not an instructor');
    }

    if (instructor.status !== 'pending') {
      throw new BadRequestException('Instructor is not pending approval');
    }

    instructor.status = UserStatus.ACTIVE as any;
    await instructor.save();

    // TODO: Send approval email
    // await this.emailService.sendInstructorApprovalEmail(instructor);

    return {
      success: true,
      message: 'Instructor approved successfully',
      instructor: {
        id: instructor._id,
        name: `${instructor.firstName} ${instructor.lastName}`,
        email: instructor.email,
        status: instructor.status,
      },
    };
  }

  /**
   * Reject instructor
   */
  async rejectInstructor(id: string, reason: string) {
    const instructor = await this.userModel.findById(id);

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    if (instructor.role !== 'instructor') {
      throw new BadRequestException('User is not an instructor');
    }

    if (instructor.status !== 'pending') {
      throw new BadRequestException('Instructor is not pending approval');
    }

    // Store rejection reason in metadata or separate collection
    // For now, just change status and delete
    await this.userModel.findByIdAndDelete(id);

    // TODO: Send rejection email
    // await this.emailService.sendInstructorRejectionEmail(instructor, reason);

    return {
      success: true,
      message: 'Instructor rejected and removed',
      reason,
    };
  }

  /**
   * Bulk delete instructors
   */
  async bulkDeleteInstructors(ids: string[]) {
    if (ids.length === 0) {
      throw new BadRequestException('No instructor IDs provided');
    }

    if (ids.length > 100) {
      throw new BadRequestException(
        'Cannot delete more than 100 instructors at once',
      );
    }

    // Verify all are instructors
    const instructors = await this.userModel.find({
      _id: { $in: ids },
      role: 'instructor',
    });

    if (instructors.length !== ids.length) {
      throw new BadRequestException('Some IDs are invalid or not instructors');
    }

    // Check if any have active courses
    const activeCourses = await this.courseModel.countDocuments({
      instructor: { $in: ids },
      status: 'published',
    });

    if (activeCourses > 0) {
      throw new BadRequestException(
        `Cannot delete instructors with active courses. Found ${activeCourses} active course(s).`,
      );
    }

    // Delete instructors
    const result = await this.userModel.deleteMany({
      _id: { $in: ids },
      role: 'instructor',
    });

    return {
      success: true,
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} instructor(s) deleted successfully`,
    };
  }

  /**
   * Bulk update instructor status
   */
  async bulkUpdateStatus(ids: string[], status: InstructorStatus) {
    if (ids.length === 0) {
      throw new BadRequestException('No instructor IDs provided');
    }

    if (ids.length > 100) {
      throw new BadRequestException(
        'Cannot update more than 100 instructors at once',
      );
    }

    // Verify all are instructors
    const instructors = await this.userModel.find({
      _id: { $in: ids },
      role: 'instructor',
    });

    if (instructors.length !== ids.length) {
      throw new BadRequestException('Some IDs are invalid or not instructors');
    }

    // Update status
    const result = await this.userModel.updateMany(
      {
        _id: { $in: ids },
        role: 'instructor',
      },
      {
        $set: {
          status: status as any,
        },
      },
    );

    return {
      success: true,
      updatedCount: result.modifiedCount,
      status,
      message: `${result.modifiedCount} instructor(s) status updated to ${status}`,
    };
  }

  /**
   * Export instructors
   */
  async exportInstructors(filters: ExportInstructorsDto) {
    const query: any = { role: 'instructor' };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Get all matching instructors
    const instructors = await this.userModel
      .find(query)
      .select('-password')
      .lean();

    // Get stats for each instructor (in parallel)
    const instructorsWithStats = await Promise.all(
      instructors.map(async (instructor: any) => {
        const courses = await this.courseModel
          .find({ instructor: instructor._id })
          .lean();

        const coursesCount = courses.length;

        const enrollments = await this.enrollmentModel
          .find({
            course: { $in: courses.map((c: any) => c._id) },
            status: 'active',
          })
          .lean();

        const studentsCount = new Set(
          enrollments.map((e: any) => e.user.toString()),
        ).size;

        const avgRating =
          coursesCount > 0
            ? courses.reduce(
                (sum: number, c: any) => sum + (c.rating || 0),
                0,
              ) / coursesCount
            : 0;

        return {
          name: `${instructor.firstName} ${instructor.lastName}`,
          email: instructor.email,
          status: instructor.status,
          specialization: instructor.specialization || '',
          experience: instructor.experience || '',
          coursesCount,
          studentsCount,
          avgRating: parseFloat(avgRating.toFixed(1)),
          joinedDate: instructor.createdAt,
        };
      }),
    );

    // Apply client-side filters (if backend doesn't support)
    let filteredInstructors = instructorsWithStats;

    if (filters.specialization) {
      filteredInstructors = filteredInstructors.filter(
        (i) => i.specialization === filters.specialization,
      );
    }

    if (filters.experience) {
      filteredInstructors = filteredInstructors.filter(
        (i) => i.experience === filters.experience,
      );
    }

    // Generate CSV
    if (filters.format === 'json' || !filters.format) {
      const csv = this.generateCSV(filteredInstructors);
      return {
        format: 'csv',
        data: csv,
        filename: `instructors-${new Date().toISOString().split('T')[0]}.csv`,
      };
    }

    // JSON format
    return {
      format: 'json',
      data: JSON.stringify(filteredInstructors, null, 2),
      filename: `instructors-${new Date().toISOString().split('T')[0]}.json`,
    };
  }

  /**
   * Generate CSV from instructor data
   */
  private generateCSV(instructors: any[]): string {
    const headers = [
      'Name',
      'Email',
      'Status',
      'Specialization',
      'Experience',
      'Courses',
      'Students',
      'Avg Rating',
      'Joined Date',
    ];

    const rows = instructors.map((i) => [
      i.name,
      i.email,
      i.status,
      i.specialization,
      i.experience,
      i.coursesCount,
      i.studentsCount,
      i.avgRating,
      new Date(i.joinedDate).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            // Escape cells with commas or quotes
            if (
              typeof cell === 'string' &&
              (cell.includes(',') || cell.includes('"'))
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(','),
      ),
    ].join('\n');

    return csvContent;
  }
}
