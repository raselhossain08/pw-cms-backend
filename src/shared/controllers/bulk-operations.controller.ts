import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

@ApiTags('Bulk Operations')
@ApiBearerAuth('JWT-auth')
@Controller('bulk')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BulkOperationsController {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Enrollment.name) private enrollmentModel: Model<Enrollment>,
  ) {}

  @Post('users/delete')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk delete users' })
  async bulkDeleteUsers(@Body() body: { userIds: string[] }) {
    const result = await this.userModel.deleteMany({
      _id: { $in: body.userIds },
      role: { $nin: [UserRole.SUPER_ADMIN, UserRole.ADMIN] }, // Protect admins
    });

    return {
      message: `${result.deletedCount} users deleted successfully`,
      deletedCount: result.deletedCount,
    };
  }

  @Put('users/update')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk update user status' })
  async bulkUpdateUsers(@Body() body: { userIds: string[]; status: string }) {
    const result = await this.userModel.updateMany(
      { _id: { $in: body.userIds } },
      { $set: { status: body.status } },
    );

    return {
      message: `${result.modifiedCount} users updated`,
      modifiedCount: result.modifiedCount,
    };
  }

  @Post('courses/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk publish/unpublish courses' })
  async bulkPublishCourses(
    @Body() body: { courseIds: string[]; isPublished: boolean },
  ) {
    const result = await this.courseModel.updateMany(
      { _id: { $in: body.courseIds } },
      { $set: { isPublished: body.isPublished } },
    );

    return {
      message: `${result.modifiedCount} courses ${body.isPublished ? 'published' : 'unpublished'}`,
      modifiedCount: result.modifiedCount,
    };
  }

  @Post('courses/delete')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk delete courses' })
  async bulkDeleteCourses(@Body() body: { courseIds: string[] }) {
    const result = await this.courseModel.deleteMany({
      _id: { $in: body.courseIds },
    });

    return {
      message: `${result.deletedCount} courses deleted`,
      deletedCount: result.deletedCount,
    };
  }

  @Post('enrollments/create')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk enroll students in course' })
  async bulkEnrollStudents(
    @Body() body: { userIds: string[]; courseId: string },
  ) {
    const enrollments = body.userIds.map((userId) => ({
      student: userId,
      course: body.courseId,
      status: 'active',
      progress: 0,
    }));

    const result = await this.enrollmentModel.insertMany(enrollments, {
      ordered: false,
    });

    return {
      message: `${result.length} students enrolled successfully`,
      enrolledCount: result.length,
    };
  }

  @Post('orders/update-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk update order status' })
  async bulkUpdateOrders(@Body() body: { orderIds: string[]; status: string }) {
    const result = await this.orderModel.updateMany(
      { _id: { $in: body.orderIds } },
      { $set: { status: body.status } },
    );

    return {
      message: `${result.modifiedCount} orders updated`,
      modifiedCount: result.modifiedCount,
    };
  }

  @Get('import-template/:entity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  async getImportTemplate(@Param('entity') entity: string) {
    const templates = {
      users:
        'firstName,lastName,email,role,phone\nJohn,Doe,john@example.com,STUDENT,+1234567890',
      courses:
        'title,description,category,level,price\nCourse Name,Description,programming,beginner,99.99',
      enrollments: 'studentEmail,courseTitle\nstudent@example.com,Course Name',
    };

    return {
      template: templates[entity] || 'Invalid entity',
      entity,
      instructions:
        'Download this template, fill it, and upload via bulk import API',
    };
  }
}
