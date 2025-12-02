import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { HeaderNavigationService } from '../services/header-navigation.service';
import {
  CreateHeaderNavigationDto,
  UpdateHeaderNavigationDto,
} from '../dto/header-navigation.dto';

@ApiTags('CMS - Header Navigation')
@Controller({ path: 'cms/header-navigation', version: VERSION_NEUTRAL })
export class HeaderNavigationController {
  constructor(
    private readonly headerNavigationService: HeaderNavigationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new header navigation' })
  @ApiResponse({
    status: 201,
    description: 'Header navigation created successfully',
  })
  async create(@Body() createDto: CreateHeaderNavigationDto) {
    return this.headerNavigationService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all header navigations' })
  @ApiResponse({
    status: 200,
    description: 'Return all header navigations',
  })
  async findAll() {
    return this.headerNavigationService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active header navigation' })
  @ApiResponse({
    status: 200,
    description: 'Return active header navigation',
  })
  async findActive() {
    return this.headerNavigationService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get header navigation by id' })
  @ApiResponse({
    status: 200,
    description: 'Return header navigation',
  })
  async findOne(@Param('id') id: string) {
    return this.headerNavigationService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update header navigation' })
  @ApiResponse({
    status: 200,
    description: 'Header navigation updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateHeaderNavigationDto,
  ) {
    return this.headerNavigationService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete header navigation' })
  @ApiResponse({
    status: 204,
    description: 'Header navigation deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.headerNavigationService.remove(id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Set header navigation as active' })
  @ApiResponse({
    status: 200,
    description: 'Header navigation activated successfully',
  })
  async setActive(@Param('id') id: string) {
    return this.headerNavigationService.setActive(id);
  }

  @Post(':id/logo')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'dark', maxCount: 1 },
      { name: 'light', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload logo images' })
  @ApiResponse({
    status: 200,
    description: 'Logo images uploaded successfully',
  })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFiles()
    files: { dark?: Express.Multer.File[]; light?: Express.Multer.File[] },
  ) {
    return this.headerNavigationService.uploadLogo(id, files);
  }

  @Post(':id/featured/:menuIndex')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload featured course image' })
  @ApiResponse({
    status: 200,
    description: 'Featured image uploaded successfully',
  })
  async uploadFeaturedImage(
    @Param('id') id: string,
    @Param('menuIndex') menuIndex: number,
    @UploadedFiles() files: { image: Express.Multer.File[] },
  ) {
    return this.headerNavigationService.uploadFeaturedImage(
      id,
      menuIndex,
      files.image[0],
    );
  }

  @Post(':id/avatar')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'avatar', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
  })
  async uploadUserAvatar(
    @Param('id') id: string,
    @UploadedFiles() files: { avatar: Express.Multer.File[] },
  ) {
    return this.headerNavigationService.uploadUserAvatar(id, files.avatar[0]);
  }

  @Post(':id/seo-image')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'ogImage', maxCount: 1 }]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload SEO OG image' })
  @ApiResponse({
    status: 200,
    description: 'SEO image uploaded successfully',
  })
  async uploadSeoImage(
    @Param('id') id: string,
    @UploadedFiles() files: { ogImage: Express.Multer.File[] },
  ) {
    return this.headerNavigationService.uploadSeoImage(id, files.ogImage[0]);
  }
}
