import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = new this.userModel(createUserDto);
    return await user.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: UserRole,
  ): Promise<{ users: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -refreshToken -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return { users, total };
  }

  async findById(id: string): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email,
        _id: { $ne: id },
      });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -refreshToken -passwordResetToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
      $inc: { loginCount: 1 },
    });
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  async setPasswordResetToken(userId: string, token: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: token,
      passwordResetExpires: new Date(Date.now() + 3600000), // 1 hour
    });
  }

  async resetPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.findById(userId);

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      emailVerified: true,
      emailVerificationToken: null,
      status: UserStatus.ACTIVE, // Activate account when email is verified
    });
  }

  async count(): Promise<number> {
    return await this.userModel.countDocuments();
  }

  async getStats(): Promise<any> {
    const totalUsers = await this.count();
    const activeUsers = await this.userModel.countDocuments({
      status: UserStatus.ACTIVE,
    });
    const students = await this.userModel.countDocuments({
      role: UserRole.STUDENT,
    });
    const instructors = await this.userModel.countDocuments({
      role: UserRole.INSTRUCTOR,
    });

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await this.userModel.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    return {
      totalUsers,
      activeUsers,
      students,
      instructors,
      recentUsers,
    };
  }

  async getInstructors(): Promise<any[]> {
    return await this.userModel
      .find({ role: UserRole.INSTRUCTOR, status: UserStatus.ACTIVE })
      .select('-password -refreshToken -passwordResetToken')
      .lean()
      .exec();
  }

  async getInstructorBySlug(slug: string): Promise<any> {
    // Generate slug from email (e.g., instructor@personalwings.com -> instructor)
    // or from firstName-lastName format
    const instructor = await this.userModel
      .findOne({
        role: UserRole.INSTRUCTOR,
        status: UserStatus.ACTIVE,
        $or: [
          { email: { $regex: `^${slug}@`, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: {
                  $concat: [
                    { $toLower: '$firstName' },
                    '-',
                    { $toLower: '$lastName' },
                  ],
                },
                regex: slug.toLowerCase(),
              },
            },
          },
        ],
      })
      .select('-password -refreshToken -passwordResetToken')
      .lean()
      .exec();

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Import Course model dynamically to avoid circular dependency
    const { Model } = await import('mongoose');
    const courseModel = this.userModel.db.model('Course');

    // Get instructor's courses
    const courses = await courseModel
      .find({
        instructor: instructor._id,
        status: 'published',
      })
      .select(
        'title slug description thumbnail price originalPrice rating reviewCount studentCount duration level categories',
      )
      .lean()
      .exec();

    // Calculate instructor stats
    const totalStudents = courses.reduce(
      (sum, course) => sum + (course.studentCount || 0),
      0,
    );
    const totalReviews = courses.reduce(
      (sum, course) => sum + (course.reviewCount || 0),
      0,
    );
    const avgRating =
      courses.length > 0
        ? courses.reduce((sum, course) => sum + (course.rating || 0), 0) /
        courses.length
        : 0;

    // Format lessons as duration string
    const formattedCourses = courses.map((course) => ({
      ...course,
      lessons: Math.ceil((course.duration || 0) / 0.5), // Estimate lessons from duration
      duration: `${course.duration || 0} hours`,
    }));

    return {
      ...instructor,
      courses: formattedCourses,
      stats: {
        totalCourses: courses.length,
        totalStudents,
        totalReviews,
        rating: parseFloat(avgRating.toFixed(1)),
      },
    };
  }

  async getGeographicDistribution(): Promise<any> {
    const distribution = await this.userModel.aggregate([
      {
        $match: { status: UserStatus.ACTIVE },
      },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return distribution.map((item) => ({
      country: item._id || 'Unknown',
      count: item.count,
    }));
  }

  async getNotificationPreferences(userId: string): Promise<any> {
    const user = await this.findById(userId);
    const prefs = user.preferences as any;
    return {
      preferences: prefs?.notificationPreferences || {
        email: {
          courseUpdates: true,
          marketing: false,
          security: true,
          system: true,
        },
        push: {
          courseUpdates: true,
          marketing: false,
          security: true,
          system: true,
        },
      },
    };
  }

  async updateNotificationPreferences(userId: string, preferences: any): Promise<any> {
    const user = await this.findById(userId);
    if (!user.preferences) {
      user.preferences = {} as any;
    }
    (user.preferences as any).notificationPreferences = preferences;
    await user.save();
    return { message: 'Notification preferences updated', preferences };
  }

  async getPrivacySettings(userId: string): Promise<any> {
    const user = await this.findById(userId);
    const prefs = user.preferences as any;
    return {
      settings: prefs?.privacySettings || {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        allowMessages: true,
        showActivity: true,
      },
    };
  }

  async updatePrivacySettings(userId: string, settings: any): Promise<any> {
    const user = await this.findById(userId);
    if (!user.preferences) {
      user.preferences = {} as any;
    }
    (user.preferences as any).privacySettings = settings;
    await user.save();
    return { message: 'Privacy settings updated', settings };
  }

  async getProfileStats(userId: string): Promise<any> {
    const user = await this.findById(userId);

    // Import Course and Enrollment models dynamically
    const { Model } = await import('mongoose');
    const enrollmentModel = this.userModel.db.model('Enrollment');
    const certificateModel = this.userModel.db.model('Certificate');

    // Get enrollments count
    const enrollments = await enrollmentModel.countDocuments({ user: userId });

    // Get completed courses count
    const completedCourses = await enrollmentModel.countDocuments({
      user: userId,
      progress: 100,
    });

    // Get certificates count
    const certificates = await certificateModel.countDocuments({ user: userId });

    return {
      stats: {
        coursesEnrolled: enrollments,
        coursesCompleted: completedCourses,
        certificatesEarned: certificates,
        totalSpent: user.totalSpent || 0,
        lastLogin: user.lastLogin?.toISOString(),
      },
    };
  }
}
