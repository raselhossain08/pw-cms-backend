import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { TopBarService } from '../services/top-bar.service';
import { CreateTopBarDto, UpdateTopBarDto } from '../dto/top-bar.dto';

@ApiTags('CMS - Top Bar')
@Controller({ path: 'cms/top-bar', version: VERSION_NEUTRAL })
export class TopBarController {
  constructor(private readonly topBarService: TopBarService) { }

  @Post()
  @ApiOperation({ summary: 'Create new top bar' })
  @ApiResponse({ status: 201, description: 'Top bar created successfully' })
  async create(@Body() createDto: CreateTopBarDto) {
    return this.topBarService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all top bars' })
  @ApiResponse({ status: 200, description: 'Return all top bars' })
  async findAll() {
    return this.topBarService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active top bar' })
  @ApiResponse({ status: 200, description: 'Return active top bar' })
  async findActive() {
    return this.topBarService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get top bar by id' })
  @ApiResponse({ status: 200, description: 'Return top bar' })
  async findOne(@Param('id') id: string) {
    return this.topBarService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update top bar' })
  @ApiResponse({ status: 200, description: 'Top bar updated successfully' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateTopBarDto) {
    return this.topBarService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete top bar' })
  @ApiResponse({ status: 204, description: 'Top bar deleted successfully' })
  async remove(@Param('id') id: string) {
    return this.topBarService.remove(id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Set top bar as active' })
  @ApiResponse({ status: 200, description: 'Top bar activated successfully' })
  async setActive(@Param('id') id: string) {
    return this.topBarService.setActive(id);
  }

  @Post(':id/news-icon')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'icon', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload news announcement icon' })
  @ApiResponse({ status: 200, description: 'Icon uploaded successfully' })
  async uploadNewsIcon(
    @Param('id') id: string,
    @UploadedFiles() files: { icon: Express.Multer.File[] },
  ) {
    return this.topBarService.uploadNewsIcon(id, files.icon[0]);
  }

  @Post(':id/language-flag/:languageCode')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'flag', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload language flag' })
  @ApiResponse({ status: 200, description: 'Flag uploaded successfully' })
  async uploadLanguageFlag(
    @Param('id') id: string,
    @Param('languageCode') languageCode: string,
    @UploadedFiles() files: { flag: Express.Multer.File[] },
  ) {
    return this.topBarService.uploadLanguageFlag(
      id,
      languageCode,
      files.flag[0],
    );
  }

  @Post(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle active status' })
  @ApiResponse({
    status: 200,
    description: 'Active status toggled successfully',
  })
  async toggleActive(@Param('id') id: string) {
    return this.topBarService.toggleActive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate top bar' })
  @ApiResponse({
    status: 200,
    description: 'Top bar duplicated successfully',
  })
  async duplicate(@Param('id') id: string) {
    return this.topBarService.duplicate(id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export top bar' })
  async export(
    @Param('id') id: string,
    @Query('format') format: 'json' | 'pdf' = 'json',
    @Res() res: Response,
  ) {
    try {
      const result = await this.topBarService.export(id, format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="top-bar_${new Date().toISOString().split('T')[0]}.pdf"`,
        );
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="top-bar_${new Date().toISOString().split('T')[0]}.json"`,
      );
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export top bar',
        data: null,
      });
    }
  }
}
