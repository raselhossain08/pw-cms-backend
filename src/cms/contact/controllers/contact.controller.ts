import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ContactService } from '../services/contact.service';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@ApiTags('CMS - Contact')
@Controller('cms/contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createContactDto: CreateContactDto) {
    const contact = await this.contactService.create(createContactDto);
    return {
      success: true,
      message: 'Contact created successfully',
      data: contact,
    };
  }

  @Get()
  async findAll() {
    const contacts = await this.contactService.findAll();
    return {
      success: true,
      message: 'Contacts retrieved successfully',
      data: contacts,
    };
  }

  @Get('active')
  async findActive() {
    const contact = await this.contactService.findActive();
    return {
      success: true,
      message: 'Active contact retrieved successfully',
      data: contact,
    };
  }

  @Get('default')
  async getOrCreateDefault() {
    const contact = await this.contactService.getOrCreateDefault();
    return {
      success: true,
      message: 'Contact retrieved successfully',
      data: contact,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const contact = await this.contactService.findOne(id);
    return {
      success: true,
      message: 'Contact retrieved successfully',
      data: contact,
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    const contact = await this.contactService.update(id, updateContactDto);
    return {
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    };
  }

  @Put(':id/upload')
  @ApiOperation({ summary: 'Update Contact with Image Upload' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles() files: { image?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    // Handle image upload
    let imageUrl = body['contactFormSection[image]'];
    if (files?.image?.[0]) {
      const result = await this.cloudinaryService.uploadImage(files.image[0]);
      imageUrl = result.url;
    }

    // Parse contactInfo from FormData
    const contactInfo = {
      email: body['contactInfo[email]'],
      location: body['contactInfo[location]'],
      phone: body['contactInfo[phone]'] || undefined,
    };

    // Parse contactFormSection from FormData
    const contactFormSection = {
      badge: body['contactFormSection[badge]'],
      title: body['contactFormSection[title]'],
      image: imageUrl,
      imageAlt: body['contactFormSection[imageAlt]'] || undefined,
    };

    // Parse mapSection from FormData
    const mapSection = {
      embedUrl: body['mapSection[embedUrl]'],
      showMap: body['mapSection[showMap]'] === 'true',
    };

    // Parse SEO metadata from FormData
    let seo:
      | {
          title?: string;
          description?: string;
          keywords?: string;
          ogImage?: string;
          ogTitle?: string;
          ogDescription?: string;
          canonicalUrl?: string;
        }
      | undefined;

    if (
      body['seo[title]'] ||
      body['seo[description]'] ||
      body['seo[keywords]']
    ) {
      seo = {
        title: body['seo[title]'] || undefined,
        description: body['seo[description]'] || undefined,
        keywords: body['seo[keywords]'] || undefined,
        ogImage: body['seo[ogImage]'] || undefined,
        ogTitle: body['seo[ogTitle]'] || undefined,
        ogDescription: body['seo[ogDescription]'] || undefined,
        canonicalUrl: body['seo[canonicalUrl]'] || undefined,
      };
    }

    const updateDto: UpdateContactDto = {
      contactInfo,
      formSection: contactFormSection,
      mapSection,
      isActive: body.isActive === 'true',
      seo,
    };

    const contact = await this.contactService.update(id, updateDto);
    return {
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.contactService.delete(id);
    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }
}
