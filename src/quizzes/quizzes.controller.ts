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
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a quiz' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  async create(@Body() createQuizDto: CreateQuizDto, @Req() req) {
    return this.quizzesService.create(createQuizDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quizzes' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'lessonId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.quizzesService.findAll({ courseId, lessonId, page, limit });
  }

  @Get('my-submissions')
  @ApiOperation({ summary: 'Get user quiz submissions' })
  @ApiQuery({ name: 'quizId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getMySubmissions(
    @Req() req,
    @Query('quizId') quizId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.quizzesService.getUserSubmissions(
      req.user.id,
      quizId,
      page,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz details' })
  async findOne(@Param('id') id: string, @Req() req) {
    return this.quizzesService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update quiz' })
  @ApiResponse({ status: 200, description: 'Quiz updated' })
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @Req() req,
  ) {
    return this.quizzesService.update(id, updateQuizDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete quiz' })
  @ApiResponse({ status: 200, description: 'Quiz deleted' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.quizzesService.remove(id, req.user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start quiz attempt' })
  @ApiResponse({ status: 201, description: 'Quiz attempt started' })
  async startQuiz(@Param('id') id: string, @Req() req) {
    return this.quizzesService.startQuiz(id, req.user.id);
  }

  @Post(':id/submit/:submissionId')
  @ApiOperation({ summary: 'Submit quiz answers' })
  @ApiResponse({ status: 200, description: 'Quiz submitted and graded' })
  async submitQuiz(
    @Param('id') id: string,
    @Param('submissionId') submissionId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @Req() req,
  ) {
    return this.quizzesService.submitQuiz(
      id,
      submissionId,
      submitQuizDto,
      req.user.id,
    );
  }

  @Get('submissions/:submissionId')
  @ApiOperation({ summary: 'Get submission details' })
  @ApiResponse({ status: 200, description: 'Submission details' })
  async getSubmission(@Param('submissionId') submissionId: string, @Req() req) {
    return this.quizzesService.getSubmission(submissionId, req.user.id);
  }

  @Get(':id/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get quiz submissions (instructors only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of submissions' })
  async getQuizSubmissions(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.quizzesService.getQuizSubmissions(id, page, limit);
  }

  @Get(':id/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get quiz statistics' })
  @ApiResponse({ status: 200, description: 'Quiz statistics' })
  async getStats(@Param('id') id: string) {
    return this.quizzesService.getQuizStats(id);
  }
}
