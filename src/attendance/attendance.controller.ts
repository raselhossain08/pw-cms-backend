import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  markAttendance(@Body() markAttendanceDto: MarkAttendanceDto, @Req() req) {
    return this.attendanceService.markAttendance(
      markAttendanceDto,
      req.user.userId,
      req,
    );
  }

  @Get('session/:sessionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getSessionAttendance(@Param('sessionId') sessionId: string) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }

  @Get('my-attendance')
  getUserAttendance(
    @Req() req,
    @Query('courseId') courseId?: string,
    @Query('present') present?: boolean,
  ) {
    return this.attendanceService.getUserAttendance(req.user.userId, {
      courseId,
      present,
    });
  }

  @Get('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getCourseAttendance(@Param('courseId') courseId: string) {
    return this.attendanceService.getCourseAttendance(courseId);
  }

  @Get('report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAttendanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.attendanceService.getAttendanceReport({
      startDate,
      endDate,
      courseId,
    });
  }

  @Patch(':id/certificate-eligibility')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateCertificateEligibility(
    @Param('id') id: string,
    @Body('eligible') eligible: boolean,
  ) {
    return this.attendanceService.updateCertificateEligibility(id, eligible);
  }
}
