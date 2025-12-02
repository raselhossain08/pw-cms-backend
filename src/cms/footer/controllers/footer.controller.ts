import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { CreateFooterDto, UpdateFooterDto } from '../dto/footer.dto';
import { FooterService } from '../services/footer.service';
import { CloudinaryService } from '../../services/cloudinary.service';

@ApiTags('CMS - Footer')
@Controller({ path: 'cms/footer', version: VERSION_NEUTRAL })
export class FooterController {
  constructor(
    private footerService: FooterService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active footer configuration (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Active footer returned successfully',
  })
  async findActive() {
    const footer = await this.footerService.findActive();
    return {
      success: true,
      message: 'Request successful',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: '/api/cms/footer/active',
        method: 'GET',
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all footer configurations (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Footer list returned successfully',
  })
  async findAll() {
    const footers = await this.footerService.findAll();
    return {
      success: true,
      message: 'Request successful',
      data: footers,
      meta: {
        timestamp: new Date().toISOString(),
        path: '/api/cms/footer',
        method: 'GET',
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get footer by ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Footer returned successfully' })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  async findById(@Param('id') id: string) {
    const footer = await this.footerService.findById(id);
    return {
      success: true,
      message: 'Request successful',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: `/api/cms/footer/${id}`,
        method: 'GET',
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new footer configuration (Admin)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 201, description: 'Footer created successfully' })
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFooterDto,
  ) {
    let logoUpload: { url: string; publicId: string } | undefined;
    if (file) {
      logoUpload = await this.cloudinaryService.uploadImage(file, 'cms/footer');
    }
    const footer = await this.footerService.create({ ...dto, logoUpload });
    return {
      success: true,
      message: 'Footer created successfully',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: '/api/cms/footer',
        method: 'POST',
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update footer configuration (Admin)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiResponse({ status: 200, description: 'Footer updated successfully' })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateFooterDto,
  ) {
    let logoUpload: { url: string; publicId: string } | undefined;
    if (file) {
      logoUpload = await this.cloudinaryService.uploadImage(file, 'cms/footer');
    }
    const footer = await this.footerService.update(id, { ...dto, logoUpload });
    return {
      success: true,
      message: 'Footer updated successfully',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: `/api/cms/footer/${id}`,
        method: 'PUT',
      },
    };
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Set footer as active (Admin)' })
  @ApiResponse({ status: 200, description: 'Footer activated successfully' })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  async setActive(@Param('id') id: string) {
    const footer = await this.footerService.setActive(id);
    return {
      success: true,
      message: 'Footer activated successfully',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: `/api/cms/footer/${id}/activate`,
        method: 'PUT',
      },
    };
  }

  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload footer logo (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @UseInterceptors(FileInterceptor('logo'))
  async replaceLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    dto: { alt?: string; width?: number; height?: number; src?: string },
  ) {
    const upload = await this.cloudinaryService.uploadImage(file, 'cms/footer');
    const footer = await this.footerService.update(id, {
      logoUpload: upload,
      logo: {
        src: dto.src || upload.url,
        alt: dto.alt ?? 'Footer Logo',
        width: dto.width ?? 140,
        height: dto.height ?? 50,
      },
    });
    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: footer,
      meta: {
        timestamp: new Date().toISOString(),
        path: `/api/cms/footer/${id}/logo`,
        method: 'POST',
      },
    };
  }
}
