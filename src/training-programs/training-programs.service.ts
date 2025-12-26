import {
    Injectable,
    NotFoundException,
    ConflictException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TrainingProgram, ProgramStatus } from './entities/training-program.entity';
import { ProgramEnrollment, EnrollmentStatus } from './entities/program-enrollment.entity';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class TrainingProgramsService {
    constructor(
        @InjectModel(TrainingProgram.name)
        private programModel: Model<TrainingProgram>,
        @InjectModel(ProgramEnrollment.name)
        private enrollmentModel: Model<ProgramEnrollment>,
    ) { }

    async create(
        createDto: CreateProgramDto,
        instructorId: string,
    ): Promise<TrainingProgram> {
        // Generate slug
        let slug = (createDto.slug || createDto.title)
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Ensure unique slug
        const baseSlug = slug;
        let counter = 1;
        while (await this.programModel.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Convert courseSequence courseIds to ObjectIds
        const courseSequence = createDto.courseSequence.map((seq) => ({
            course: new Types.ObjectId(seq.courseId),
            order: seq.order,
            prerequisites: seq.prerequisites
                ? seq.prerequisites.map((id) => new Types.ObjectId(id))
                : [],
            isOptional: seq.isOptional || false,
            estimatedDuration: seq.estimatedDuration,
        }));

        const program = new this.programModel({
            ...createDto,
            slug,
            instructor: new Types.ObjectId(instructorId),
            courseSequence,
        });

        return await program.save();
    }

    async findAll(params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: ProgramStatus;
        level?: string;
        instructorId?: string;
    }): Promise<{ programs: TrainingProgram[]; total: number }> {
        const { page = 1, limit = 10, search, status, level, instructorId } = params;
        const skip = (page - 1) * limit;

        const query: any = { isActive: true };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        if (status) query.status = status;
        if (level) query.level = level;
        if (instructorId) query.instructor = new Types.ObjectId(instructorId);

        const [programs, total] = await Promise.all([
            this.programModel
                .find(query)
                .populate('instructor', 'firstName lastName email avatar')
                .populate('courseSequence.course', 'title thumbnail duration')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.programModel.countDocuments(query),
        ]);

        return { programs: programs as any, total };
    }

    async findOne(id: string): Promise<TrainingProgram> {
        const program = await this.programModel
            .findById(id)
            .populate('instructor', 'firstName lastName email avatar')
            .populate('courseSequence.course', 'title thumbnail duration price level')
            .lean();

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        return program as any;
    }

    async findBySlug(slug: string): Promise<TrainingProgram> {
        const program = await this.programModel
            .findOne({ slug, isActive: true })
            .populate('instructor', 'firstName lastName email avatar')
            .populate('courseSequence.course', 'title thumbnail duration price level')
            .lean();

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        return program as any;
    }

    async update(
        id: string,
        updateDto: UpdateProgramDto,
        userId: string,
        userRole: UserRole,
    ): Promise<TrainingProgram> {
        const program = await this.programModel.findById(id);

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        // Check permissions
        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.ADMIN &&
            program.instructor.toString() !== userId
        ) {
            throw new ForbiddenException('Access denied');
        }

        // Convert courseSequence if provided
        if (updateDto.courseSequence) {
            updateDto['courseSequence'] = updateDto.courseSequence.map((seq: any) => ({
                courseId: seq.courseId, // Keep as string
                order: seq.order,
                prerequisites: seq.prerequisites || [],
                isOptional: seq.isOptional || false,
                estimatedDuration: seq.estimatedDuration,
            }));
        }

        Object.assign(program, updateDto);
        return await program.save();
    }

    async remove(
        id: string,
        userId: string,
        userRole: UserRole,
    ): Promise<void> {
        const program = await this.programModel.findById(id);

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.ADMIN &&
            program.instructor.toString() !== userId
        ) {
            throw new ForbiddenException('Access denied');
        }

        program.isActive = false;
        await program.save();
    }

    async publish(
        id: string,
        userId: string,
        userRole: UserRole,
    ): Promise<TrainingProgram> {
        const program = await this.programModel.findById(id);

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.ADMIN &&
            program.instructor.toString() !== userId
        ) {
            throw new ForbiddenException('Access denied');
        }

        program.status = ProgramStatus.PUBLISHED;
        return await program.save();
    }

    async unpublish(
        id: string,
        userId: string,
        userRole: UserRole,
    ): Promise<TrainingProgram> {
        const program = await this.programModel.findById(id);

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.ADMIN &&
            program.instructor.toString() !== userId
        ) {
            throw new ForbiddenException('Access denied');
        }

        program.status = ProgramStatus.DRAFT;
        return await program.save();
    }

    async duplicate(
        id: string,
        userId: string,
    ): Promise<TrainingProgram> {
        const original = await this.programModel.findById(id);

        if (!original) {
            throw new NotFoundException('Training program not found');
        }

        const duplicated = new this.programModel({
            ...original.toObject(),
            _id: undefined,
            title: `${original.title} (Copy)`,
            slug: `${original.slug}-copy-${Date.now()}`,
            status: ProgramStatus.DRAFT,
            enrollmentCount: 0,
            completionCount: 0,
            rating: 0,
            reviewCount: 0,
            createdAt: undefined,
            updatedAt: undefined,
        });

        return await duplicated.save();
    }

    async enroll(
        programId: string,
        studentId: string,
        paymentId?: string,
    ): Promise<ProgramEnrollment> {
        // Check if already enrolled
        const existing = await this.enrollmentModel.findOne({
            program: new Types.ObjectId(programId),
            student: new Types.ObjectId(studentId),
        });

        if (existing) {
            throw new ConflictException('Already enrolled in this program');
        }

        const program = await this.programModel.findById(programId);
        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        // Initialize course progress
        const courseProgress = program.courseSequence.map((seq) => ({
            course: seq.course,
            progress: 0,
            isCompleted: false,
            startedAt: undefined,
            completedAt: undefined,
        }));

        const enrollment = new this.enrollmentModel({
            program: new Types.ObjectId(programId),
            student: new Types.ObjectId(studentId),
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
            overallProgress: 0,
            courseProgress,
            payment: paymentId ? new Types.ObjectId(paymentId) : undefined,
            lastAccessedAt: new Date(),
        });

        await enrollment.save();

        // Increment enrollment count
        program.enrollmentCount += 1;
        await program.save();

        return enrollment;
    }

    async getMyEnrollments(
        studentId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ enrollments: ProgramEnrollment[]; total: number }> {
        const skip = (page - 1) * limit;

        const [enrollments, total] = await Promise.all([
            this.enrollmentModel
                .find({ student: new Types.ObjectId(studentId) })
                .populate('program')
                .sort({ enrolledAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.enrollmentModel.countDocuments({
                student: new Types.ObjectId(studentId),
            }),
        ]);

        return { enrollments: enrollments as any, total };
    }

    async getProgramEnrollments(
        programId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ enrollments: ProgramEnrollment[]; total: number }> {
        const skip = (page - 1) * limit;

        const [enrollments, total] = await Promise.all([
            this.enrollmentModel
                .find({ program: new Types.ObjectId(programId) })
                .populate('student', 'firstName lastName email avatar')
                .sort({ enrolledAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.enrollmentModel.countDocuments({
                program: new Types.ObjectId(programId),
            }),
        ]);

        return { enrollments: enrollments as any, total };
    }

    async updateProgress(
        enrollmentId: string,
        courseId: string,
        progress: number,
    ): Promise<ProgramEnrollment> {
        const enrollment = await this.enrollmentModel.findById(enrollmentId);

        if (!enrollment) {
            throw new NotFoundException('Enrollment not found');
        }

        // Update course progress
        const courseProgress = enrollment.courseProgress.find(
            (cp: any) => cp.course.toString() === courseId,
        );

        if (courseProgress) {
            courseProgress.progress = progress;
            if (progress >= 100 && !courseProgress.isCompleted) {
                courseProgress.isCompleted = true;
                courseProgress.completedAt = new Date();
            }
            if (progress > 0 && !courseProgress.startedAt) {
                courseProgress.startedAt = new Date();
            }
        }

        // Calculate overall progress
        const totalProgress = enrollment.courseProgress.reduce(
            (sum: number, cp: any) => sum + cp.progress,
            0,
        );
        enrollment.overallProgress =
            totalProgress / enrollment.courseProgress.length;

        // Check if program completed
        const allCompleted = enrollment.courseProgress.every(
            (cp: any) => cp.isCompleted,
        );
        if (allCompleted && enrollment.status === EnrollmentStatus.ACTIVE) {
            enrollment.status = EnrollmentStatus.COMPLETED;
            enrollment.completedAt = new Date();

            // Update program completion count
            const program = await this.programModel.findById(enrollment.program);
            if (program) {
                program.completionCount += 1;
                await program.save();
            }
        }

        enrollment.lastAccessedAt = new Date();
        return await enrollment.save();
    }

    async getStats(): Promise<any> {
        const [
            totalPrograms,
            publishedPrograms,
            totalEnrollments,
            totalCompletions,
        ] = await Promise.all([
            this.programModel.countDocuments({ isActive: true }),
            this.programModel.countDocuments({
                isActive: true,
                status: ProgramStatus.PUBLISHED,
            }),
            this.enrollmentModel.countDocuments(),
            this.enrollmentModel.countDocuments({
                status: EnrollmentStatus.COMPLETED,
            }),
        ]);

        const avgRating =
            (await this.programModel
                .aggregate([
                    { $match: { isActive: true } },
                    { $group: { _id: null, avgRating: { $avg: '$rating' } } },
                ])
                .then((res) => res[0]?.avgRating)) || 0;

        return {
            totalPrograms,
            publishedPrograms,
            totalEnrollments,
            totalCompletions,
            averageRating: Math.round(avgRating * 10) / 10,
            completionRate:
                totalEnrollments > 0
                    ? Math.round((totalCompletions / totalEnrollments) * 100)
                    : 0,
        };
    }

    async bulkDelete(
        ids: string[],
        userId: string,
        userRole: UserRole,
    ): Promise<{ deleted: number }> {
        let deleted = 0;

        for (const id of ids) {
            try {
                await this.remove(id, userId, userRole);
                deleted++;
            } catch (error) {
                console.error(`Failed to delete program ${id}:`, error);
            }
        }

        return { deleted };
    }

    async toggleStatus(
        id: string,
        userId: string,
        userRole: UserRole,
    ): Promise<TrainingProgram> {
        const program = await this.programModel.findById(id);

        if (!program) {
            throw new NotFoundException('Training program not found');
        }

        if (
            userRole !== UserRole.SUPER_ADMIN &&
            userRole !== UserRole.ADMIN &&
            program.instructor.toString() !== userId
        ) {
            throw new ForbiddenException('Access denied');
        }

        program.status =
            program.status === ProgramStatus.PUBLISHED
                ? ProgramStatus.DRAFT
                : ProgramStatus.PUBLISHED;

        return await program.save();
    }
}
