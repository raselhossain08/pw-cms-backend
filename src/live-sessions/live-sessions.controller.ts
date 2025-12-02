import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SessionStatus } from './entities/live-session.entity';

@ApiTags('Live Sessions')
@Controller('live-sessions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a live session' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  async create(@Body() createSessionDto: CreateLiveSessionDto, @Req() req) {
    return this.liveSessionsService.create(createSessionDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all live sessions' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'status', enum: SessionStatus, required: false })
  @ApiQuery({ name: 'upcoming', type: Boolean, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('status') status?: SessionStatus,
    @Query('upcoming') upcoming?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.liveSessionsService.findAll({
      courseId,
      status,
      upcoming,
      page,
      limit,
    });
  }

  @Get('my-sessions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get instructor sessions' })
  @ApiQuery({ name: 'status', enum: SessionStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of instructor sessions' })
  async getMySessionsAsync(
    @Req() req,
    @Query('status') status?: SessionStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.liveSessionsService.getInstructorSessions(
      req.user.id,
      status,
      page,
      limit,
    );
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming sessions for user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of upcoming sessions' })
  async getUpcoming(@Req() req, @Query('limit') limit: number = 5) {
    return this.liveSessionsService.getUpcomingSessions(req.user.id, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  async findOne(@Param('id') id: string) {
    return this.liveSessionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update session' })
  @ApiResponse({ status: 200, description: 'Session updated' })
  async update(
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateLiveSessionDto,
    @Req() req,
  ) {
    return this.liveSessionsService.update(id, updateSessionDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel session' })
  @ApiResponse({ status: 200, description: 'Session cancelled' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.liveSessionsService.remove(id, req.user.id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a live session' })
  @ApiResponse({ status: 200, description: 'Joined session successfully' })
  async join(@Param('id') id: string, @Req() req) {
    return this.liveSessionsService.joinSession(id, req.user.id);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a live session' })
  @ApiResponse({ status: 200, description: 'Left session successfully' })
  async leave(@Param('id') id: string, @Req() req) {
    return this.liveSessionsService.leaveSession(id, req.user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Start a live session' })
  @ApiResponse({ status: 200, description: 'Session started' })
  async start(@Param('id') id: string, @Req() req) {
    return this.liveSessionsService.startSession(id, req.user.id);
  }

  @Post(':id/end')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'End a live session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async end(
    @Param('id') id: string,
    @Body('recordingUrl') recordingUrl: string,
    @Req() req,
  ) {
    return this.liveSessionsService.endSession(id, req.user.id, recordingUrl);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get session statistics' })
  @ApiResponse({ status: 200, description: 'Session statistics' })
  async getStats(@Param('id') id: string) {
    return this.liveSessionsService.getSessionStats(id);
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get course sessions' })
  @ApiQuery({ name: 'upcoming', type: Boolean, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of course sessions' })
  async getCourseSessions(
    @Param('courseId') courseId: string,
    @Query('upcoming') upcoming: boolean = false,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.liveSessionsService.getCourseSessions(
      courseId,
      upcoming,
      page,
      limit,
    );
  }
}
