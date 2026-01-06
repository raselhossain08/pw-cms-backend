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
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async create(@Body() createQuizDto: CreateQuizDto, @Req() req) {
    try {
      const quiz = await this.quizzesService.create(createQuizDto, req.user.id);
      return {
        success: true,
        message: 'Quiz created successfully',
        data: quiz,
      };
    } catch (error) {
      throw error;
    }
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
    try {
      const result = await this.quizzesService.findAll({
        courseId,
        lessonId,
        page: page ? +page : 1,
        limit: limit ? +limit : 10,
      });
      return {
        success: true,
        ...result,
        pagination: {
          page: page ? +page : 1,
          limit: limit ? +limit : 10,
          total: result.total,
          totalPages: Math.ceil(result.total / (limit ? +limit : 10)),
        },
      };
    } catch (error) {
      throw error;
    }
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
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async findOne(@Param('id') id: string, @Req() req) {
    try {
      const quiz = await this.quizzesService.findOne(id, req.user.id);
      return {
        success: true,
        data: quiz,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update quiz' })
  @ApiResponse({ status: 200, description: 'Quiz updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @Req() req,
  ) {
    try {
      const quiz = await this.quizzesService.update(
        id,
        updateQuizDto,
        req.user.id,
      );
      return {
        success: true,
        message: 'Quiz updated successfully',
        data: quiz,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete quiz' })
  @ApiResponse({ status: 200, description: 'Quiz deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not your quiz' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async remove(@Param('id') id: string, @Req() req) {
    try {
      await this.quizzesService.remove(id, req.user.id);
      return {
        success: true,
        message: 'Quiz deleted successfully',
      };
    } catch (error) {
      throw error;
    }
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

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle quiz active status' })
  @ApiResponse({ status: 200, description: 'Quiz status toggled' })
  async toggleStatus(@Param('id') id: string, @Req() req) {
    return this.quizzesService.toggleStatus(id, req.user.id);
  }

  @Post(':id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Duplicate a quiz' })
  @ApiResponse({ status: 201, description: 'Quiz duplicated successfully' })
  async duplicate(@Param('id') id: string, @Req() req) {
    return this.quizzesService.duplicate(id, req.user.id);
  }

  @Post('bulk-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk delete quizzes' })
  @ApiResponse({ status: 200, description: 'Quizzes deleted' })
  async bulkDelete(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.quizzesService.bulkDelete(body.ids, req.user.id);
    return {
      message: `${result.deleted} quiz${result.deleted > 1 ? 'zes' : ''} deleted successfully`,
      ...result,
    };
  }

  @Post('bulk-toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bulk toggle quiz status' })
  @ApiResponse({ status: 200, description: 'Quiz statuses updated' })
  async bulkToggleStatus(@Body() body: { ids: string[] }, @Req() req) {
    const result = await this.quizzesService.bulkToggleStatus(
      body.ids,
      req.user.id,
    );
    return {
      message: `${result.updated} quiz${result.updated > 1 ? 'zes' : ''} updated successfully`,
      ...result,
    };
  }

  @Get('export/:format')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Export quizzes to CSV, XLSX, or PDF' })
  @ApiResponse({ status: 200, description: 'Quizzes exported successfully' })
  async exportQuizzes(
    @Param('format') format: 'csv' | 'xlsx' | 'pdf',
    @Query('courseId') courseId?: string,
    @Req() req?: any,
    @Res() res?: Response,
  ): Promise<any> {
    const result = await this.quizzesService.exportQuizzes(format, {
      courseId,
      userId: req?.user?.id,
    });

    if (!res) {
      return result;
    }

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=quizzes-${Date.now()}.csv`,
      );
      return res.send(result);
    } else if (format === 'xlsx') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=quizzes-${Date.now()}.xlsx`,
      );
      return res.json(result);
    } else if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/json');
      return res.json(result);
    }
  }
}
