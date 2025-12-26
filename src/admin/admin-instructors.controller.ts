import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Delete,
    Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminInstructorsService } from './admin-instructors.service';
import {
    BulkDeleteInstructorsDto,
    BulkUpdateStatusDto,
    RejectInstructorDto,
    ExportInstructorsDto,
} from './dto/instructor-admin.dto';

@Controller('admin/instructors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminInstructorsController {
    constructor(
        private readonly adminInstructorsService: AdminInstructorsService,
    ) { }

    /**
     * Get overall instructor statistics
     * GET /admin/instructors/stats
     */
    @Get('stats')
    async getOverallStats() {
        return await this.adminInstructorsService.getOverallStats();
    }

    /**
     * Get pending instructors awaiting approval
     * GET /admin/instructors/pending
     */
    @Get('pending')
    async getPendingInstructors(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20',
    ) {
        return await this.adminInstructorsService.getPendingInstructors(
            parseInt(page),
            parseInt(limit),
        );
    }

    /**
     * Export instructors to CSV
     * GET /admin/instructors/export
     */
    @Get('export')
    async exportInstructors(@Query() filters: ExportInstructorsDto) {
        return await this.adminInstructorsService.exportInstructors(filters);
    }

    /**
     * Get individual instructor statistics
     * GET /admin/instructors/:id/stats
     */
    @Get(':id/stats')
    async getInstructorStats(@Param('id') id: string) {
        return await this.adminInstructorsService.getInstructorStats(id);
    }

    /**
     * Approve pending instructor
     * POST /admin/instructors/:id/approve
     */
    @Post(':id/approve')
    async approveInstructor(@Param('id') id: string) {
        return await this.adminInstructorsService.approveInstructor(id);
    }

    /**
     * Reject pending instructor
     * POST /admin/instructors/:id/reject
     */
    @Post(':id/reject')
    async rejectInstructor(
        @Param('id') id: string,
        @Body() rejectDto: RejectInstructorDto,
    ) {
        return await this.adminInstructorsService.rejectInstructor(
            id,
            rejectDto.reason,
        );
    }

    /**
     * Bulk delete instructors
     * POST /admin/instructors/bulk-delete
     */
    @Post('bulk-delete')
    async bulkDeleteInstructors(@Body() bulkDeleteDto: BulkDeleteInstructorsDto) {
        return await this.adminInstructorsService.bulkDeleteInstructors(
            bulkDeleteDto.ids,
        );
    }

    /**
     * Bulk update instructor status
     * POST /admin/instructors/bulk-status
     */
    @Post('bulk-status')
    async bulkUpdateStatus(@Body() bulkUpdateDto: BulkUpdateStatusDto) {
        return await this.adminInstructorsService.bulkUpdateStatus(
            bulkUpdateDto.ids,
            bulkUpdateDto.status,
        );
    }
}
