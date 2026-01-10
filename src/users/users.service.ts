import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection, ClientSession } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectConnection() private connection: Connection,
  ) { }

  /**
   * Create a new user with comprehensive validation and transaction support
   * @param createUserDto - User data transfer object
   * @returns Created user without sensitive fields
   */
  async create(createUserDto: CreateUserDto): Promise<any> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(`Creating new user with email: ${createUserDto.email}`);

      // Comprehensive input validation
      this.validateUserInput(createUserDto);

      // Check if user already exists
      const existingUser = await this.userModel.findOne({
        email: createUserDto.email.toLowerCase(),
      }).session(session);

      if (existingUser) {
        throw new ConflictException(
          `An instructor with email ${createUserDto.email} already exists`,
        );
      }

      // Sanitize and prepare user data
      const sanitizedData = this.sanitizeUserData(createUserDto);

      // Ensure timestamps are set
      const userData = {
        ...sanitizedData,
        email: createUserDto.email.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create user within transaction
      const user = new this.userModel(userData);
      const savedUser = await user.save({ session });

      // Commit transaction
      await session.commitTransaction();

      this.logger.log(`User created successfully: ${savedUser._id}`);

      // Return user without sensitive fields - convert to plain object with proper serialization
      const userObject = savedUser.toObject();
      const { password, refreshToken, passwordResetToken, ...userWithoutSensitiveData } = userObject;

      // Ensure dates are properly serialized to ISO strings
      const serializedUser: any = {
        ...userWithoutSensitiveData,
        _id: (savedUser._id as any).toString(),
        createdAt: savedUser.createdAt?.toISOString
          ? savedUser.createdAt.toISOString()
          : savedUser.createdAt,
        updatedAt: savedUser.updatedAt?.toISOString
          ? savedUser.updatedAt.toISOString()
          : savedUser.updatedAt,
      };

      // Debug log to verify specialization is included
      this.logger.debug('Created user data:', {
        hasSpecialization: !!serializedUser.specialization,
        hasExperience: !!serializedUser.experience,
        specialization: serializedUser.specialization,
        experience: serializedUser.experience,
      });

      return serializedUser;
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        'Failed to create user. Please try again.',
      );
    } finally {
      session.endSession();
    }
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

    // Ensure createdAt, updatedAt, and name are properly formatted
    const formattedUsers = users.map((user: any) => ({
      ...user,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date(),
    }));

    return { users: formattedUsers, total };
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

  /**
   * Update user with comprehensive validation, transaction support, and audit logging
   * @param id - User ID
   * @param updateUserDto - Update data transfer object
   * @returns Updated user without sensitive fields
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const session: ClientSession = await this.connection.startSession();
    session.startTransaction();

    try {
      this.logger.log(`Updating user: ${id}`);

      // Validate ID format
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid user ID format');
      }

      // Validate input data
      this.validateUserInput(updateUserDto, true);

      // Get the old user data for audit logging and validation
      const oldUser = await this.userModel.findById(id).lean().session(session);
      if (!oldUser) {
        throw new NotFoundException('User not found');
      }

      // Validate email uniqueness if being updated
      if (updateUserDto.email) {
        const existingUser = await this.userModel.findOne({
          email: updateUserDto.email.toLowerCase(),
          _id: { $ne: id },
        }).session(session);

        if (existingUser) {
          throw new ConflictException(
            `An instructor with email ${updateUserDto.email} already exists`,
          );
        }
        updateUserDto.email = updateUserDto.email.toLowerCase();
      }

      // Sanitize update data
      const sanitizedData = this.sanitizeUserData(updateUserDto);

      // Update the user with updatedAt timestamp
      const user = await this.userModel
        .findByIdAndUpdate(
          id,
          {
            ...sanitizedData,
            updatedAt: new Date(),
          },
          { new: true, session, runValidators: true },
        )
        .select('-password -refreshToken -passwordResetToken')
        .lean();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Commit transaction
      await session.commitTransaction();

      // Ensure all fields are properly serialized
      const serializedUser = {
        ...user,
        _id: user._id.toString(),
        createdAt: user.createdAt?.toISOString ? user.createdAt.toISOString() : user.createdAt,
        updatedAt: user.updatedAt?.toISOString ? user.updatedAt.toISOString() : user.updatedAt,
      };

      // Debug log to verify specialization is included
      this.logger.debug('Serialized user data:', {
        hasSpecialization: !!serializedUser.specialization,
        hasExperience: !!serializedUser.experience,
        specialization: serializedUser.specialization,
        experience: serializedUser.experience,
      });

      // Log the changes for audit trail
      const changes = this.getChanges(oldUser, sanitizedData);
      this.logger.log(`User updated successfully: ${id}`);
      this.logger.debug('User update audit log:', {
        userId: id,
        timestamp: new Date().toISOString(),
        changes,
        updatedBy: 'system', // In production, get from request context
        fieldsModified: Object.keys(changes).length,
      });

      return serializedUser;
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      this.logger.error(`Failed to update user ${id}: ${error.message}`, error.stack);

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new InternalServerErrorException(
        'Failed to update user. Please try again.',
      );
    } finally {
      session.endSession();
    }
  }

  /**
   * Comprehensive input validation for all field types
   * @param data - User data to validate
   * @param isUpdate - Whether this is an update operation
   */
  private validateUserInput(data: CreateUserDto | UpdateUserDto, isUpdate = false): void {
    // Email validation
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new BadRequestException('Invalid email format');
      }
    }

    // Phone validation
    if (data.phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(data.phone.replace(/[\s\-()]/g, ''))) {
        throw new BadRequestException(
          'Invalid phone number format. Please use international format',
        );
      }
    }

    // Name validation
    if (data.firstName && data.firstName.trim().length < 2) {
      throw new BadRequestException('First name must be at least 2 characters');
    }
    if (data.lastName && data.lastName.trim().length < 2) {
      throw new BadRequestException('Last name must be at least 2 characters');
    }

    // Number field validation
    if (data.flightHours !== undefined) {
      if (typeof data.flightHours !== 'number' || data.flightHours < 0) {
        throw new BadRequestException('Flight hours must be a positive number');
      }
    }

    // Array validation
    if (data.certifications !== undefined) {
      if (!Array.isArray(data.certifications)) {
        throw new BadRequestException('Certifications must be an array');
      }
    }

    // URL validation for avatar and cover photo
    const urlRegex = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (data.avatar && !urlRegex.test(data.avatar)) {
      throw new BadRequestException('Invalid avatar URL format');
    }
    if (data.coverPhoto && !urlRegex.test(data.coverPhoto)) {
      throw new BadRequestException('Invalid cover photo URL format');
    }

    // Bio length validation
    if (data.bio && data.bio.length > 2000) {
      throw new BadRequestException('Bio must not exceed 2000 characters');
    }

    // Specialization validation
    if (data.specialization !== undefined) {
      if (data.specialization && typeof data.specialization !== 'string') {
        throw new BadRequestException('Specialization must be a string');
      }
      if (data.specialization && data.specialization.length > 200) {
        throw new BadRequestException('Specialization must not exceed 200 characters');
      }
    }

    // Experience validation
    if (data.experience !== undefined) {
      const validExperience = ['expert', 'advanced', 'intermediate'];
      if (data.experience && !validExperience.includes(data.experience)) {
        throw new BadRequestException(
          `Experience must be one of: ${validExperience.join(', ')}`,
        );
      }
    }

    // Required fields for create operation
    if (!isUpdate) {
      if (!data.firstName || !data.lastName || !data.email) {
        throw new BadRequestException('First name, last name, and email are required');
      }
    }
  }

  /**
   * Sanitize user data to prevent injection and trim strings
   * @param data - User data to sanitize
   * @returns Sanitized data
   */
  private sanitizeUserData(data: CreateUserDto | UpdateUserDto): any {
    const sanitized: any = { ...data };

    // Trim string fields
    if (sanitized.firstName) sanitized.firstName = sanitized.firstName.trim();
    if (sanitized.lastName) sanitized.lastName = sanitized.lastName.trim();
    if (sanitized.email) sanitized.email = sanitized.email.trim().toLowerCase();
    if (sanitized.bio) sanitized.bio = sanitized.bio.trim();
    if (sanitized.specialization) sanitized.specialization = sanitized.specialization.trim();
    if (sanitized.country) sanitized.country = sanitized.country.trim();
    if (sanitized.state) sanitized.state = sanitized.state.trim();
    if (sanitized.city) sanitized.city = sanitized.city.trim();
    if (sanitized.experience) sanitized.experience = sanitized.experience.trim().toLowerCase();

    // Remove any potential XSS in string fields
    const cleanString = (str: string) => str.replace(/<script[^>]*>.*?<\/script>/gi, '');
    if (sanitized.bio) sanitized.bio = cleanString(sanitized.bio);

    // Ensure numeric fields are numbers
    if (sanitized.flightHours !== undefined) {
      sanitized.flightHours = Number(sanitized.flightHours);
    }

    return sanitized;
  }

  /**
   * Helper method to track changes for audit logging
   * @param oldData - Original data
   * @param newData - New data
   * @returns Object containing changes with old and new values
   */
  private getChanges(oldData: any, newData: any): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    Object.keys(newData).forEach((key) => {
      if (newData[key] !== undefined && oldData[key] !== newData[key]) {
        // Handle nested objects
        if (typeof newData[key] === 'object' && newData[key] !== null) {
          if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes[key] = {
              old: oldData[key],
              new: newData[key],
            };
          }
        } else {
          changes[key] = {
            old: oldData[key],
            new: newData[key],
          };
        }
      }
    });

    return changes;
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
    
    // Explicitly serialize dates to avoid Mongoose lean() issues
    const result = instructors.map((instructor: any) => {
      // Convert dates to ISO strings before spreading
      const createdAt = instructor.createdAt ? new Date(instructor.createdAt).toISOString() : null;
      const updatedAt = instructor.updatedAt ? new Date(instructor.updatedAt).toISOString() : null;
      const lastLogin = instructor.lastLogin ? new Date(instructor.lastLogin).toISOString() : null;
      
      console.log(`   - ${instructor._id}: ${instructor.firstName} ${instructor.lastName} - createdAt: ${createdAt}`);
      
      // Create plain object with serialized dates
      return {
        _id: instructor._id,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        email: instructor.email,
        phone: instructor.phone,
        avatar: instructor.avatar,
        bio: instructor.bio,
        role: instructor.role,
        status: instructor.status,
        isActive: instructor.isActive,
        emailVerified: instructor.emailVerified,
        specialization: instructor.specialization,
        experience: instructor.experience,
        country: instructor.country,
        createdAt,
        updatedAt,
        lastLogin,
      };
    });
    
    return result;
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
