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

  async count(filter: any = {}): Promise<number> {
    return await this.userModel.countDocuments(filter);
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
    // Return all instructors (including inactive) for course assignment dropdown
    // This ensures courses with inactive instructors can still be viewed/edited
    const instructors = await this.userModel
      .find({ role: UserRole.INSTRUCTOR })
      .select('-password -refreshToken -passwordResetToken')
      .sort({ status: -1, firstName: 1 }) // Active first, then by name
      .lean()
      .exec();

    console.log(`📋 getInstructors() returning ${instructors.length} instructors`);
    instructors.forEach((i: any) => {
      console.log(`   - ${i._id}: ${i.firstName} ${i.lastName} (${i.email}) - Status: ${i.status}`);
    });

    return instructors;
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

  async updateNotificationPreferences(
    userId: string,
    preferences: any,
  ): Promise<any> {
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
    const certificates = await certificateModel.countDocuments({
      user: userId,
    });

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

  async generateApiKey(userId: string): Promise<string> {
    const apiKey = `pk_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
    await this.userModel.findByIdAndUpdate(userId, { apiKey });
    return apiKey;
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          isActive: true,
          status: UserStatus.ACTIVE,
        },
        { new: true },
      )
      .select('-password -refreshToken -passwordResetToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deactivateUser(userId: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          isActive: false,
          status: UserStatus.INACTIVE,
        },
        { new: true },
      )
      .select('-password -refreshToken -passwordResetToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async bulkDeleteUsers(userIds: string[]): Promise<any> {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    const validIds = userIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new BadRequestException('No valid user IDs provided');
    }

    const result = await this.userModel.deleteMany({
      _id: { $in: validIds },
    });

    return {
      message: `${result.deletedCount} users deleted successfully`,
      deletedCount: result.deletedCount,
    };
  }

  async bulkUpdateUsers(
    userIds: string[],
    status?: UserStatus,
    isActive?: boolean,
  ): Promise<any> {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    // Validate all IDs
    const validIds = userIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new BadRequestException('No valid user IDs provided');
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) {
      updateData.isActive = isActive;
      // Auto-set status based on isActive
      if (isActive) {
        updateData.status = UserStatus.ACTIVE;
      } else {
        updateData.status = UserStatus.INACTIVE;
      }
    }

    const result = await this.userModel.updateMany(
      { _id: { $in: validIds } },
      { $set: updateData },
    );

    return {
      message: `${result.modifiedCount} users updated successfully`,
      modifiedCount: result.modifiedCount,
    };
  }

  async sendVerificationEmail(userId: string): Promise<any> {
    const user = await this.findById(userId);

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15);

    await this.userModel.findByIdAndUpdate(userId, {
      emailVerificationToken: verificationToken,
    });

    // TODO: Integrate with email service to send verification email
    // For now, return the token (in production, this should be sent via email)
    return {
      message: 'Verification email sent successfully',
      // Remove this in production - only for testing
      verificationToken,
      email: user.email,
    };
  }

  // ==================== STUDENT-SPECIFIC METHODS ====================

  /**
   * Get detailed student progress including enrollments, quiz scores, and activity
   */
  async getStudentProgress(studentId: string): Promise<any> {
    const student = await this.findById(studentId);

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    // Get models from connection to avoid circular dependency
    const Enrollment = this.userModel.db.model('Enrollment');
    const Quiz = this.userModel.db.model('Quiz');

    // Get enrollments with course details
    const enrollments = await Enrollment.find({ student: studentId })
      .populate('course', 'title slug thumbnail duration')
      .populate('certificate', 'certificateNumber issuedAt')
      .sort({ lastAccessedAt: -1 })
      .lean()
      .exec();

    // Get quiz scores
    const quizScores = await Quiz.aggregate([
      {
        $match: {
          'submissions.student': new Types.ObjectId(studentId),
        },
      },
      {
        $unwind: '$submissions',
      },
      {
        $match: {
          'submissions.student': new Types.ObjectId(studentId),
        },
      },
      {
        $group: {
          _id: '$_id',
          quizTitle: { $first: '$title' },
          courseId: { $first: '$course' },
          bestScore: { $max: '$submissions.score' },
          avgScore: { $avg: '$submissions.score' },
          totalAttempts: { $sum: 1 },
          lastAttempt: { $max: '$submissions.submittedAt' },
        },
      },
    ]);

    // Calculate summary statistics
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(
      (e: any) => e.status === 'completed',
    ).length;
    const overallProgress =
      totalEnrollments > 0
        ? Math.round(
          enrollments.reduce(
            (sum: number, e: any) => sum + (e.progress || 0),
            0,
          ) / totalEnrollments,
        )
        : 0;
    const avgQuizScore =
      quizScores.length > 0
        ? Math.round(
          quizScores.reduce((sum, q: any) => sum + q.avgScore, 0) /
          quizScores.length,
        )
        : 0;
    const totalTimeSpent = enrollments.reduce(
      (sum: number, e: any) => sum + (e.totalTimeSpent || 0),
      0,
    );
    const certificatesEarned = enrollments.filter(
      (e: any) => e.certificate,
    ).length;

    return {
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        avatar: student.avatar,
        country: student.country,
      },
      enrollments: enrollments.map((e: any) => ({
        courseId: e.course?._id,
        courseName: e.course?.title,
        courseSlug: e.course?.slug,
        thumbnail: e.course?.thumbnail,
        progress: e.progress || 0,
        status: e.status,
        lastAccessed: e.lastAccessedAt,
        timeSpent: e.totalTimeSpent || 0,
        certificate: e.certificate
          ? {
            certificateNumber: e.certificate.certificateNumber,
            issuedAt: e.certificate.issuedAt,
          }
          : null,
      })),
      quizzes: quizScores.map((q: any) => ({
        quizId: q._id,
        quizTitle: q.quizTitle,
        courseId: q.courseId,
        bestScore: Math.round(q.bestScore),
        avgScore: Math.round(q.avgScore),
        attempts: q.totalAttempts,
        lastAttempt: q.lastAttempt,
      })),
      summary: {
        totalEnrollments,
        completedEnrollments,
        overallProgress,
        avgQuizScore,
        totalTimeSpent,
        certificatesEarned,
      },
    };
  }

  /**
   * Import multiple students from CSV/Excel data
   */
  async importStudents(
    students: any[],
    sendWelcomeEmail: boolean = false,
  ): Promise<any> {
    if (!students || students.length === 0) {
      throw new BadRequestException('No student data provided');
    }

    const results = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[],
      students: [] as any[],
    };

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      const row = i + 1;

      try {
        // Validate required fields
        if (!studentData.email) {
          results.errors.push({
            row,
            field: 'email',
            reason: 'Email is required',
            data: studentData,
          });
          results.failed++;
          continue;
        }

        if (!studentData.firstName || !studentData.lastName) {
          results.errors.push({
            row,
            field: 'name',
            reason: 'First name and last name are required',
            data: studentData,
          });
          results.failed++;
          continue;
        }

        // Check if user already exists
        const existingUser = await this.userModel.findOne({
          email: studentData.email,
        });

        if (existingUser) {
          results.errors.push({
            row,
            field: 'email',
            reason: 'User with this email already exists',
            data: studentData,
          });
          results.skipped++;
          continue;
        }

        // Generate random password if not provided
        const password =
          studentData.password || Math.random().toString(36).slice(-8);

        // Create student
        const user = new this.userModel({
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          password,
          role: UserRole.STUDENT,
          phone: studentData.phone || '',
          country: studentData.country || '',
          status: studentData.status || UserStatus.ACTIVE,
          isActive: true,
        });

        await user.save();

        results.imported++;
        results.students.push({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          password: password, // Return password for welcome email
        });

        // TODO: Send welcome email if sendWelcomeEmail is true
        if (sendWelcomeEmail) {
          // Integrate with email service
          console.log(`Welcome email should be sent to ${user.email}`);
        }
      } catch (error) {
        results.errors.push({
          row,
          field: 'general',
          reason: error.message || 'Unknown error occurred',
          data: studentData,
        });
        results.failed++;
      }
    }

    return {
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
      ...results,
    };
  }

  /**
   * Send broadcast email to multiple students
   */
  async sendBroadcastEmail(
    subject: string,
    message: string,
    studentIds?: string[],
    courseId?: string,
  ): Promise<any> {
    if (!subject || !message) {
      throw new BadRequestException('Subject and message are required');
    }

    let recipients: User[] = [];

    if (courseId) {
      // Get students enrolled in specific course
      const Enrollment = this.userModel.db.model('Enrollment');

      const enrollments = await Enrollment.find({ course: courseId })
        .populate('student')
        .exec();

      recipients = enrollments.map((e: any) => e.student).filter(Boolean);
    } else if (studentIds && studentIds.length > 0) {
      // Get specific students
      recipients = await this.userModel
        .find({
          _id: { $in: studentIds },
          role: UserRole.STUDENT,
        })
        .exec();
    } else {
      // Get all active students
      recipients = await this.userModel
        .find({
          role: UserRole.STUDENT,
          isActive: true,
          status: UserStatus.ACTIVE,
        })
        .exec();
    }

    if (recipients.length === 0) {
      throw new BadRequestException('No recipients found');
    }

    // TODO: Integrate with email service to send emails
    // For now, just return success message
    const emailPromises = recipients.map((student) => {
      console.log(`Broadcast email should be sent to ${student.email}`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      // In production, this would be:
      // return emailService.send(student.email, subject, message);
      return Promise.resolve({ email: student.email, sent: true });
    });

    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      message: `Broadcast email queued successfully`,
      queued: recipients.length,
      sent,
      failed,
      recipients: recipients.map((s) => ({
        id: s._id,
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
      })),
    };
  }

  /**
   * Send individual message to a student
   */
  async sendMessageToStudent(
    studentId: string,
    subject: string,
    message: string,
    type: 'email' | 'notification' | 'both' = 'email',
  ): Promise<any> {
    const student = await this.findById(studentId);

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    if (!subject || !message) {
      throw new BadRequestException('Subject and message are required');
    }

    // TODO: Integrate with email/notification service
    console.log(`Message should be sent to ${student.email}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message: ${message}`);
    console.log(`Type: ${type}`);

    // In production:
    // if (type === 'email' || type === 'both') {
    //   await emailService.send(student.email, subject, message);
    // }
    // if (type === 'notification' || type === 'both') {
    //   await notificationService.create(studentId, subject, message);
    // }

    return {
      sent: true,
      message: `Message sent successfully to ${student.firstName} ${student.lastName}`,
      recipient: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
      },
      type,
    };
  }

  async exportUserData(userId: string): Promise<any> {
    const user = await this.findById(userId);

    // Remove sensitive information
    const userData = user.toJSON();
    delete userData.password;
    delete userData.passwordResetToken;
    delete userData.emailVerificationToken;
    delete userData.refreshToken;
    delete userData.apiKey;

    return {
      success: true,
      message: 'User data exported successfully',
      data: {
        profile: userData,
        exportedAt: new Date().toISOString(),
        format: 'JSON',
      },
    };
  }
}
