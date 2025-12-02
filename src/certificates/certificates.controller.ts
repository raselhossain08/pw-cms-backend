import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Req,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../shared/decorators/public.decorator';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('generate/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate certificate for completed course' })
  @ApiResponse({ status: 201, description: 'Certificate generated' })
  async generate(@Param('courseId') courseId: string, @Req() req) {
    return this.certificatesService.generateCertificate(req.user.id, courseId);
  }

  @Get('my-certificates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user certificates' })
  @ApiResponse({ status: 200, description: 'List of certificates' })
  async getMyCertificates(@Req() req) {
    return this.certificatesService.getUserCertificates(req.user.id);
  }

  // Template Management Endpoints (Must be before :id route)
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all certificate templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates(@Req() req) {
    return this.certificatesService.getTemplates(req.user.id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create certificate template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
    @Req() req,
  ) {
    return this.certificatesService.createTemplate(
      createTemplateDto,
      req.user.id,
    );
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update certificate template' })
  @ApiResponse({ status: 200, description: 'Template updated' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @Req() req,
  ) {
    return this.certificatesService.updateTemplate(
      id,
      updateTemplateDto,
      req.user.id,
    );
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete certificate template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async deleteTemplate(@Param('id') id: string, @Req() req) {
    await this.certificatesService.deleteTemplate(id, req.user.id);
    return { message: 'Template deleted successfully' };
  }

  @Get('verify/:certificateId')
  @Public()
  @ApiOperation({ summary: 'Verify certificate authenticity' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  async verify(@Param('certificateId') certificateId: string) {
    return this.certificatesService.verifyCertificate(certificateId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get certificate by ID' })
  @ApiResponse({ status: 200, description: 'Certificate details' })
  async getCertificate(@Param('id') id: string) {
    return this.certificatesService.getCertificate(id);
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course certificates (Instructor)' })
  @ApiResponse({ status: 200, description: 'List of certificates' })
  async getCourseCertificates(@Param('courseId') courseId: string) {
    return this.certificatesService.getCourseCertificates(courseId);
  }

  @Post('admin/generate/:userId/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Generate certificate for a user' })
  @ApiResponse({ status: 201, description: 'Certificate generated' })
  async adminGenerateCertificate(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
    @Query('sendEmail') sendEmail?: string,
  ) {
    const shouldSendEmail = sendEmail === 'true';
    return this.certificatesService.adminGenerateCertificate(
      userId,
      courseId,
      shouldSendEmail,
    );
  }

  @Post('admin/send-email/:certificateId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Send certificate via email' })
  @ApiResponse({ status: 200, description: 'Certificate email sent' })
  async adminSendCertificateEmail(
    @Param('certificateId') certificateId: string,
  ) {
    await this.certificatesService.adminSendCertificateEmail(certificateId);
    return { message: 'Certificate email sent successfully' };
  }

  @Post('admin/bulk-generate/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Bulk generate certificates for course' })
  @ApiResponse({ status: 201, description: 'Certificates generated' })
  async adminBulkGenerateCertificates(
    @Param('courseId') courseId: string,
    @Query('sendEmail') sendEmail?: string,
    @Query('userIds') userIds?: string,
  ) {
    const shouldSendEmail = sendEmail === 'true';
    const userIdArray = userIds ? userIds.split(',') : [];
    return this.certificatesService.adminBulkGenerateCertificates(
      courseId,
      userIdArray,
      shouldSendEmail,
    );
  }
}
