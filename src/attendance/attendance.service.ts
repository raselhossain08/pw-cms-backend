import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Attendance } from './entities/attendance.entity';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { LiveSession } from '../live-sessions/entities/live-session.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private attendanceModel: Model<Attendance>,
    @InjectModel(LiveSession.name) private liveSessionModel: Model<LiveSession>,
  ) {}

  async markAttendance(
    markAttendanceDto: MarkAttendanceDto,
    userId: string,
    req: any,
  ): Promise<Attendance> {
    const session = await this.liveSessionModel
      .findById(markAttendanceDto.sessionId)
      .exec();
    if (!session) {
      throw new NotFoundException('Live session not found');
    }

    // Check if attendance already exists
    let attendance = await this.attendanceModel
      .findOne({
        sessionId: markAttendanceDto.sessionId,
        userId,
      })
      .exec();

    if (attendance) {
      // Update existing attendance
      attendance.leftAt = new Date();
      const joinedTime = attendance.joinedAt.getTime();
      const leftTime = attendance.leftAt.getTime();
      attendance.duration = Math.floor((leftTime - joinedTime) / (1000 * 60)); // minutes

      attendance.activityLog.push({
        timestamp: new Date(),
        action: 'left_session',
      });
    } else {
      // Create new attendance
      attendance = new this.attendanceModel({
        sessionId: markAttendanceDto.sessionId,
        userId,
        courseId: session.course,
        joinedAt: new Date(),
        present: markAttendanceDto.present !== false,
        ipAddress: req.ip,
        deviceInfo: req.headers['user-agent'],
        activityLog: [
          {
            timestamp: new Date(),
            action: 'joined_session',
          },
        ],
      });
    }

    return attendance.save();
  }

  async getSessionAttendance(sessionId: string): Promise<any> {
    const attendances = await this.attendanceModel
      .find({ sessionId })
      .populate('userId', 'firstName lastName email')
      .sort({ joinedAt: 1 })
      .exec();

    const totalAttendees = attendances.length;
    const presentCount = attendances.filter((a) => a.present).length;
    const averageDuration =
      attendances.reduce((sum, a) => sum + a.duration, 0) /
      (totalAttendees || 1);

    return {
      attendances,
      stats: {
        totalAttendees,
        presentCount,
        absentCount: totalAttendees - presentCount,
        attendanceRate:
          totalAttendees > 0 ? (presentCount / totalAttendees) * 100 : 0,
        averageDuration: Math.round(averageDuration),
      },
    };
  }

  async getUserAttendance(userId: string, filters: any = {}): Promise<any> {
    const query: any = { userId };

    if (filters.courseId) query.courseId = filters.courseId;
    if (filters.present !== undefined) query.present = filters.present;

    const attendances = await this.attendanceModel
      .find(query)
      .populate('sessionId', 'title startTime endTime')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 })
      .exec();

    const totalSessions = attendances.length;
    const presentCount = attendances.filter((a) => a.present).length;
    const totalDuration = attendances.reduce((sum, a) => sum + a.duration, 0);

    return {
      attendances,
      stats: {
        totalSessions,
        presentCount,
        absentCount: totalSessions - presentCount,
        attendanceRate:
          totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0,
        totalDuration,
        averageDuration:
          totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
      },
    };
  }

  async getCourseAttendance(courseId: string): Promise<any> {
    const attendances = await this.attendanceModel
      .find({ courseId })
      .populate('userId', 'firstName lastName email')
      .populate('sessionId', 'title startTime')
      .exec();

    // Group by user
    const userAttendance = attendances.reduce((acc, att) => {
      const userId = att.userId.toString();
      if (!acc[userId]) {
        acc[userId] = {
          user: att.userId,
          sessions: [],
          totalSessions: 0,
          presentCount: 0,
          totalDuration: 0,
        };
      }
      acc[userId].sessions.push(att);
      acc[userId].totalSessions++;
      if (att.present) acc[userId].presentCount++;
      acc[userId].totalDuration += att.duration;
      return acc;
    }, {});

    const report = Object.values(userAttendance).map((data: any) => ({
      user: data.user,
      totalSessions: data.totalSessions,
      presentCount: data.presentCount,
      attendanceRate: (data.presentCount / data.totalSessions) * 100,
      totalDuration: data.totalDuration,
      averageDuration: Math.round(data.totalDuration / data.totalSessions),
    }));

    return report;
  }

  async getAttendanceReport(filters: any): Promise<any> {
    const { startDate, endDate, courseId } = filters;
    const query: any = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (courseId) query.courseId = courseId;

    const attendances = await this.attendanceModel.find(query).exec();

    const totalRecords = attendances.length;
    const presentCount = attendances.filter((a) => a.present).length;
    const uniqueUsers = new Set(attendances.map((a) => a.userId.toString()))
      .size;
    const uniqueSessions = new Set(
      attendances.map((a) => a.sessionId.toString()),
    ).size;
    const totalDuration = attendances.reduce((sum, a) => sum + a.duration, 0);

    return {
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Now',
      },
      summary: {
        totalRecords,
        presentCount,
        absentCount: totalRecords - presentCount,
        attendanceRate:
          totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0,
        uniqueUsers,
        uniqueSessions,
        totalDuration,
        averageDuration:
          totalRecords > 0 ? Math.round(totalDuration / totalRecords) : 0,
      },
    };
  }

  async updateCertificateEligibility(
    attendanceId: string,
    eligible: boolean,
  ): Promise<Attendance | null> {
    const attendance = await this.attendanceModel
      .findByIdAndUpdate(
        attendanceId,
        { certificateEligible: eligible },
        { new: true },
      )
      .exec();

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }
}
