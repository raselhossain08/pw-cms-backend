import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Res,
  UseInterceptors,
  UploadedFiles,
  Param,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { BlogService } from '../services/blog.service';
import { UpdateBlogDto } from '../dto/blog.dto';

@Controller('cms/home/blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }

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

  @Post(':slug/view')
  async trackView(@Param('slug') slug: string) {
    const result = await this.blogService.incrementView(slug);
    return {
      success: true,
      data: { views: result.views },
      message: 'View tracked successfully',
    };
  }

  @Post(':slug/like')
  async toggleLike(@Param('slug') slug: string, @Req() req: any) {
    const result = await this.blogService.toggleLike(slug, req.user?.userId);
    return {
      success: true,
      data: {
        likes: result.likes,
        isLiked: result.isLiked,
      },
      message: result.isLiked ? 'Post liked' : 'Post unliked',
    };
  }

  @Get(':slug/like')
  async getLikeStatus(@Param('slug') slug: string, @Req() req: any) {
    const result = await this.blogService.getLikeStatus(slug, req.user?.userId);
    return {
      success: true,
      data: {
        likes: result.likes,
        isLiked: result.isLiked,
      },
    };
  }

  @Get(':slug/comments')
  async getComments(@Param('slug') slug: string) {
    const comments = await this.blogService.getComments(slug);
    return {
      success: true,
      data: comments,
    };
  }

  @Post(':slug/comments')
  async addComment(
    @Param('slug') slug: string,
    @Body() createCommentDto: any,
    @Req() req: any,
  ) {
    const comment = await this.blogService.addComment(slug, {
      ...createCommentDto,
      userId: req.user?.userId,
    });
    return {
      success: true,
      data: comment,
      message: 'Comment added successfully',
    };
  }

  @Delete(':slug/comments/:commentId')
  async deleteComment(
    @Param('slug') slug: string,
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    await this.blogService.deleteComment(slug, commentId, req.user?.userId);
    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }

  @Post(':slug/duplicate')
  async duplicateBlogPost(@Param('slug') slug: string) {
    try {
      const duplicated = await this.blogService.duplicateBlogPost(slug);
      return {
        success: true,
        message: 'Blog post duplicated successfully',
        data: duplicated,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to duplicate blog post',
        data: null,
      };
    }
  }

  @Get('export')
  async export(@Query('format') format: 'json' | 'pdf' = 'json', @Res() res: Response) {
    try {
      const result = await this.blogService.export(format);

      if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="blog_${new Date().toISOString().split('T')[0]}.pdf"`);
        return res.send(result);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="blog_${new Date().toISOString().split('T')[0]}.json"`);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to export blog',
        data: null,
      });
    }
  }
}
