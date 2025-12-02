import {
  Controller,
  Get,
  Patch,
  Body,
  UseInterceptors,
  UploadedFiles,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BlogService } from '../services/blog.service';
import { UpdateBlogDto } from '../dto/blog.dto';

@Controller('cms/home/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async getBlog() {
    const blog = await this.blogService.findOne();
    return {
      success: true,
      data: blog,
    };
  }

  @Get(':slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    const blog = await this.blogService.findOne();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    return {
      success: true,
      data: blogPost,
    };
  }

  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image_0', maxCount: 1 },
      { name: 'image_1', maxCount: 1 },
      { name: 'image_2', maxCount: 1 },
      { name: 'image_3', maxCount: 1 },
      { name: 'image_4', maxCount: 1 },
      { name: 'image_5', maxCount: 1 },
      { name: 'image_6', maxCount: 1 },
      { name: 'image_7', maxCount: 1 },
      { name: 'image_8', maxCount: 1 },
      { name: 'image_9', maxCount: 1 },
      { name: 'avatar_0', maxCount: 1 },
      { name: 'avatar_1', maxCount: 1 },
      { name: 'avatar_2', maxCount: 1 },
      { name: 'avatar_3', maxCount: 1 },
      { name: 'avatar_4', maxCount: 1 },
      { name: 'avatar_5', maxCount: 1 },
      { name: 'avatar_6', maxCount: 1 },
      { name: 'avatar_7', maxCount: 1 },
      { name: 'avatar_8', maxCount: 1 },
      { name: 'avatar_9', maxCount: 1 },
    ]),
  )
  async updateBlog(
    @Body() updateBlogDto: UpdateBlogDto,
    @UploadedFiles()
    files?: { [key: string]: Express.Multer.File[] },
  ) {
    // Parse JSON strings back to objects if needed
    if (typeof updateBlogDto.blogs === 'string') {
      updateBlogDto.blogs = JSON.parse(updateBlogDto.blogs as any);
    }
    if (typeof updateBlogDto.seo === 'string') {
      updateBlogDto.seo = JSON.parse(updateBlogDto.seo as any);
    }

    const blog = await this.blogService.update(updateBlogDto, files);
    return {
      success: true,
      data: blog,
      message: 'Blog section updated successfully',
    };
  }

  @Patch('toggle-active')
  async toggleActive() {
    const blog = await this.blogService.toggleActive();
    return {
      success: true,
      data: blog,
      message: `Blog section is now ${blog.isActive ? 'active' : 'inactive'}`,
    };
  }
}
