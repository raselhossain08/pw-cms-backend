import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LiveSession, SessionStatus } from './entities/live-session.entity';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';
import * as crypto from 'crypto';

@Injectable()
export class LiveSessionsService {
  constructor(
    @InjectModel(LiveSession.name) private sessionModel: Model<LiveSession>,
  ) {}

  async create(
    createSessionDto: CreateLiveSessionDto,
    instructorId: string,
  ): Promise<LiveSession> {
    const { courseId, ...sessionData } = createSessionDto;

    // Generate meeting credentials
    const meetingId = this.generateMeetingId();
    const meetingPassword = this.generatePassword();
    const meetingUrl = `${process.env.FRONTEND_URL}/live-sessions/${meetingId}`;

    const session = new this.sessionModel({
      ...sessionData,
      course: courseId,
      instructor: instructorId,
      meetingId,
      meetingPassword,
      meetingUrl,
    });

    return await session.save();
  }

  async findAll(query: {
    courseId?: string;
    instructorId?: string;
    status?: SessionStatus;
    upcoming?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ sessions: LiveSession[]; total: number }> {
    const {
      courseId,
      instructorId,
      status,
      upcoming,
      page = 1,
      limit = 10,
    } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (courseId) filter.course = courseId;
    if (instructorId) filter.instructor = instructorId;
    if (status) filter.status = status;

    if (upcoming) {
      filter.scheduledAt = { $gte: new Date() };
      filter.status = SessionStatus.SCHEDULED;
    }

    const [sessions, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .populate('course', 'title thumbnail')
        .populate('instructor', 'firstName lastName avatar')
        .sort({ scheduledAt: upcoming ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.sessionModel.countDocuments(filter),
    ]);

    return { sessions, total };
  }

  async findOne(id: string): Promise<LiveSession> {
    const session = await this.sessionModel
      .findById(id)
      .populate('course')
      .populate('instructor', 'firstName lastName avatar bio')
      .populate('attendees', 'firstName lastName avatar');

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async update(
    id: string,
    updateSessionDto: UpdateLiveSessionDto,
    instructorId: string,
  ): Promise<LiveSession> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only update your own sessions');
    }

    if (session.status === SessionStatus.LIVE) {
      throw new BadRequestException('Cannot update live session');
    }

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException('Cannot update ended session');
    }

    Object.assign(session, updateSessionDto);
    return await session.save();
  }

  async remove(id: string, instructorId: string): Promise<void> {
    const session = await this.sessionModel.findById(id);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.instructor.toString() !== instructorId) {
      throw new ForbiddenException('You can only delete your own sessions');
    }

    if (session.status === SessionStatus.LIVE) {
      throw new BadRequestException('Cannot delete live session');
    }

    session.status = SessionStatus.CANCELLED;
    await session.save();
  }

  async joinSession(sessionId: string, userId: string): Promise<LiveSession> {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === SessionStatus.CANCELLED) {
      throw new BadRequestException('Session is cancelled');
    }

    if (session.status === SessionStatus.ENDED) {
      throw new BadRequestException('Session has ended');
    }

    // Check if session is scheduled to start soon (within 15 minutes)
    const now = new Date();
    const scheduledTime = new Date(session.scheduledAt);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / 60000);

    if (session.status === SessionStatus.SCHEDULED && minutesDiff > 15) {
      throw new BadRequestException('Session not yet available to join');
    }

    // Check max attendees
    if (session.attendees.length >= session.maxAttendees) {
      throw new BadRequestException('Session is full');
    }

    // Add attendee if not already in list
    const userObjectId = new Types.ObjectId(userId);
    if (!session.attendees.some((id) => id.toString() === userId)) {
      session.attendees.push(userObjectId);
      session.attendanceLog.set(userId, new Date());
    }

    // Start session if instructor joins
    if (
      session.instructor.toString() === userId &&
      session.status === SessionStatus.SCHEDULED
    ) {
      session.status = SessionStatus.LIVE;
      session.startedAt = new Date();
    }

    return await session.save();
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.attendees = session.attendees.filter(
      (id) => id.toString() !== userId,
    );
    await session.save();
  }

  async startSession(
    sessionId: string,
    instructorId: string,
  ): Promise<LiveSession> {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.instructor.toString() !== instructorId) {
      throw new ForbiddenException('Only the instructor can start the session');
    }

    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session already started or ended');
    }

    session.status = SessionStatus.LIVE;
    session.startedAt = new Date();

    return await session.save();
  }

  async endSession(
    sessionId: string,
    instructorId: string,
    recordingUrl?: string,
  ): Promise<LiveSession> {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.instructor.toString() !== instructorId) {
      throw new ForbiddenException('Only the instructor can end the session');
    }

    if (session.status !== SessionStatus.LIVE) {
      throw new BadRequestException('Session is not live');
    }

    session.status = SessionStatus.ENDED;
    session.endedAt = new Date();
    if (recordingUrl) {
      session.recordingUrl = recordingUrl;
    }

    return await session.save();
  }

  async getUpcomingSessions(
    userId: string,
    limit: number = 5,
  ): Promise<LiveSession[]> {
    const now = new Date();

    return await this.sessionModel
      .find({
        attendees: userId,
        scheduledAt: { $gte: now },
        status: SessionStatus.SCHEDULED,
      })
      .populate('course', 'title')
      .populate('instructor', 'firstName lastName')
      .sort({ scheduledAt: 1 })
      .limit(limit)
      .exec();
  }

  async getSessionStats(sessionId: string): Promise<any> {
    const session = await this.sessionModel.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const attendanceCount = session.attendees.length;
    const attendanceRate =
      session.maxAttendees > 0
        ? Math.round((attendanceCount / session.maxAttendees) * 100)
        : 0;

    const averageAttendanceTime =
      session.endedAt && session.startedAt
        ? Math.round(
            (session.endedAt.getTime() - session.startedAt.getTime()) / 60000,
          )
        : 0;

    return {
      totalAttendees: attendanceCount,
      maxAttendees: session.maxAttendees,
      attendanceRate,
      duration: session.duration,
      actualDuration: averageAttendanceTime,
      status: session.status,
      hasRecording: !!session.recordingUrl,
    };
  }

  private generateMeetingId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private generatePassword(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  async getInstructorSessions(
    instructorId: string,
    status?: SessionStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ sessions: LiveSession[]; total: number }> {
    return this.findAll({ instructorId, status, page, limit });
  }

  async getCourseSessions(
    courseId: string,
    upcoming: boolean = false,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ sessions: LiveSession[]; total: number }> {
    return this.findAll({ courseId, upcoming, page, limit });
  }
}
