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
import { TrainingProgramsService } from './training-programs.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../shared/decorators/public.decorator';
import { ProgramStatus } from './entities/training-program.entity';

@ApiTags('Training Programs')
@Controller('training-programs')
export class TrainingProgramsController {
    constructor(private readonly service: TrainingProgramsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create training program' })
    @ApiResponse({ status: 201, description: 'Program created' })
    async create(@Body() createDto: CreateProgramDto, @Req() req) {
        return this.service.create(createDto, req.user.id);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all training programs' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: ProgramStatus })
    @ApiQuery({ name: 'level', required: false, type: String })
    @ApiResponse({ status: 200, description: 'List of programs' })
    async findAll(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: ProgramStatus,
        @Query('level') level?: string,
    ) {
        return this.service.findAll({ page, limit, search, status, level });
    }

    @Get('instructor/my-programs')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get instructor programs' })
    @ApiResponse({ status: 200, description: 'List of instructor programs' })
    async getInstructorPrograms(@Req() req) {
        return this.service.findAll({ instructorId: req.user.id });
    }

    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get program statistics' })
    @ApiResponse({ status: 200, description: 'Program statistics' })
    async getStats() {
        return this.service.getStats();
    }

    @Get('my-enrollments')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get my program enrollments' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of enrollments' })
    async getMyEnrollments(
        @Req() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.service.getMyEnrollments(req.user.id, page, limit);
    }

    @Get('slug/:slug')
    @Public()
    @ApiOperation({ summary: 'Get program by slug' })
    @ApiResponse({ status: 200, description: 'Program details' })
    async findBySlug(@Param('slug') slug: string) {
        return this.service.findBySlug(slug);
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get program by ID' })
    @ApiResponse({ status: 200, description: 'Program details' })
    async findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update program' })
    @ApiResponse({ status: 200, description: 'Program updated' })
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateProgramDto,
        @Req() req,
    ) {
        return this.service.update(id, updateDto, req.user.id, req.user.role);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete program' })
    @ApiResponse({ status: 200, description: 'Program deleted' })
    async remove(@Param('id') id: string, @Req() req) {
        await this.service.remove(id, req.user.id, req.user.role);
        return { message: 'Program deleted successfully' };
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Publish program' })
    @ApiResponse({ status: 200, description: 'Program published' })
    async publish(@Param('id') id: string, @Req() req) {
        return this.service.publish(id, req.user.id, req.user.role);
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Unpublish program' })
    @ApiResponse({ status: 200, description: 'Program unpublished' })
    async unpublish(@Param('id') id: string, @Req() req) {
        return this.service.unpublish(id, req.user.id, req.user.role);
    }

    @Post(':id/duplicate')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Duplicate program' })
    @ApiResponse({ status: 201, description: 'Program duplicated' })
    async duplicate(@Param('id') id: string, @Req() req) {
        return this.service.duplicate(id, req.user.id);
    }

    @Patch(':id/toggle-status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Toggle program status' })
    @ApiResponse({ status: 200, description: 'Status toggled' })
    async toggleStatus(@Param('id') id: string, @Req() req) {
        return this.service.toggleStatus(id, req.user.id, req.user.role);
    }

    @Post('bulk-delete')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Bulk delete programs' })
    @ApiResponse({ status: 200, description: 'Programs deleted' })
    async bulkDelete(@Body() body: { ids: string[] }, @Req() req) {
        const result = await this.service.bulkDelete(
            body.ids,
            req.user.id,
            req.user.role,
        );
        return {
            message: `${result.deleted} program${result.deleted > 1 ? 's' : ''} deleted successfully`,
            ...result,
        };
    }

    @Post(':id/enroll')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Enroll in program' })
    @ApiResponse({ status: 201, description: 'Enrolled successfully' })
    async enroll(
        @Param('id') id: string,
        @Body() body: { paymentId?: string },
        @Req() req,
    ) {
        return this.service.enroll(id, req.user.id, body.paymentId);
    }

    @Get(':id/enrollments')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get program enrollments' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of enrollments' })
    async getProgramEnrollments(
        @Param('id') id: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.service.getProgramEnrollments(id, page, limit);
    }

    @Patch('enrollments/:enrollmentId/progress')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update course progress in enrollment' })
    @ApiResponse({ status: 200, description: 'Progress updated' })
    async updateProgress(
        @Param('enrollmentId') enrollmentId: string,
        @Body() body: { courseId: string; progress: number },
    ) {
        return this.service.updateProgress(
            enrollmentId,
            body.courseId,
            body.progress,
        );
    }
}
