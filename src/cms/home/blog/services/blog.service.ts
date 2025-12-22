import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from '../schemas/blog.schema';
import { CreateBlogDto, UpdateBlogDto } from '../dto/blog.dto';
import { CloudinaryService } from '../../../services/cloudinary.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    private cloudinaryService: CloudinaryService,
  ) { }

  async create(createBlogDto: CreateBlogDto): Promise<Blog> {
    const blog = new this.blogModel(createBlogDto);
    return blog.save();
  }

  async findOne(): Promise<Blog | null> {
    const blog = await this.blogModel.findOne({ isActive: true }).lean().exec();

    if (blog && blog.blogs) {
      // Explicitly convert dates to strings to ensure they survive JSON serialization
      blog.blogs = blog.blogs.map(post => {
        const p = post as any;
        return {
          ...p,
          publishedAt: p.publishedAt ? new Date(p.publishedAt).toISOString() : new Date().toISOString(),
        };
      });
    }

    return blog ? (blog as unknown as Blog) : null;
  }

  async update(
    updateBlogDto: UpdateBlogDto,
    images?: { [key: string]: Express.Multer.File[] },
  ): Promise<Blog> {
    let blog = await this.blogModel.findOne().exec();

    if (!blog) {
      // If no document exists, create one
      blog = new this.blogModel(updateBlogDto as CreateBlogDto);
    } else {
      // Update existing document

      // Manually update fields to ensure proper assignment
      if (updateBlogDto.title !== undefined) blog.title = updateBlogDto.title;
      if (updateBlogDto.subtitle !== undefined)
        blog.subtitle = updateBlogDto.subtitle;
      if (updateBlogDto.description !== undefined)
        blog.description = updateBlogDto.description;
      if (updateBlogDto.isActive !== undefined)
        blog.isActive = updateBlogDto.isActive;

      // Deep update for blogs array - cast to any to avoid type mismatch
      if (updateBlogDto.blogs !== undefined) {
        blog.blogs = updateBlogDto.blogs as any;
      }

      // Deep update for seo object - cast to any to avoid type mismatch
      if (updateBlogDto.seo !== undefined) {
        blog.seo = updateBlogDto.seo as any;
      }
    }

    // Handle image uploads if provided
    if (images) {
      for (const [key, files] of Object.entries(images)) {
        if (files && files.length > 0) {
          // Handle blog post images
          const imageMatch = key.match(/^image_(\d+)$/);
          if (imageMatch) {
            const index = parseInt(imageMatch[1], 10);
            const result = await this.uploadImage(files[0]);
            if (blog.blogs && blog.blogs[index]) {
              blog.blogs[index].image = result.url;
            }
          }

          // Handle author avatars
          const avatarMatch = key.match(/^avatar_(\d+)$/);
          if (avatarMatch) {
            const index = parseInt(avatarMatch[1], 10);
            const result = await this.uploadImage(files[0]);
            if (blog.blogs && blog.blogs[index] && blog.blogs[index].author) {
              blog.blogs[index].author.avatar = result.url;
            }
          }
        }
      }
    }

    return blog.save();
  }

  async toggleActive(): Promise<Blog> {
    const blog = await this.blogModel.findOne().exec();
    if (!blog) {
      throw new NotFoundException('Blog section not found');
    }
    blog.isActive = !blog.isActive;
    return blog.save();
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    return this.cloudinaryService.uploadImage(file, 'blog-images');
  }

  async incrementView(slug: string): Promise<{ views: number }> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    blogPost.views = (blogPost.views || 0) + 1;
    await blog.save();

    return { views: blogPost.views };
  }

  async toggleLike(
    slug: string,
    userId?: string,
  ): Promise<{ likes: number; isLiked: boolean }> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // For now, just increment/decrement likes
    // In production, you'd want to track which users liked which posts
    const isLiked = (blogPost as any).likedBy?.includes(userId) || false;

    if (isLiked) {
      blogPost.likes = Math.max(0, (blogPost.likes || 0) - 1);
      if ((blogPost as any).likedBy) {
        (blogPost as any).likedBy = (blogPost as any).likedBy.filter(
          (id: string) => id !== userId,
        );
      }
    } else {
      blogPost.likes = (blogPost.likes || 0) + 1;
      if (!(blogPost as any).likedBy) {
        (blogPost as any).likedBy = [];
      }
      (blogPost as any).likedBy.push(userId);
    }

    await blog.save();

    return {
      likes: blogPost.likes,
      isLiked: !isLiked,
    };
  }

  async getLikeStatus(
    slug: string,
    userId?: string,
  ): Promise<{ likes: number; isLiked: boolean }> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    const isLiked =
      userId && (blogPost as any).likedBy
        ? (blogPost as any).likedBy.includes(userId)
        : false;

    return {
      likes: blogPost.likes || 0,
      isLiked,
    };
  }

  async getComments(slug: string): Promise<any[]> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Return comments from blogPost if they exist
    return (blogPost as any).comments || [];
  }

  async addComment(
    slug: string,
    commentData: {
      userId?: string;
      userName: string;
      userEmail: string;
      content: string;
      parentId?: string;
    },
  ): Promise<any> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    if (!(blogPost as any).comments) {
      (blogPost as any).comments = [];
    }

    const comment = {
      _id: new Date().getTime().toString(),
      postSlug: slug,
      userId: commentData.userId,
      userName: commentData.userName,
      userEmail: commentData.userEmail,
      content: commentData.content,
      parentId: commentData.parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (blogPost as any).comments.push(comment);
    blogPost.commentsCount = ((blogPost as any).comments?.length || 0) + 1;
    await blog.save();

    return comment;
  }

  async deleteComment(
    slug: string,
    commentId: string,
    userId?: string,
  ): Promise<void> {
    const blog = await this.blogModel.findOne({ isActive: true }).exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    if (!(blogPost as any).comments) {
      throw new NotFoundException('Comment not found');
    }

    const commentIndex = (blogPost as any).comments.findIndex(
      (c: any) => c._id === commentId,
    );

    if (commentIndex === -1) {
      throw new NotFoundException('Comment not found');
    }

    const comment = (blogPost as any).comments[commentIndex];

    // Check if user owns the comment or is admin
    if (userId && comment.userId !== userId) {
      throw new NotFoundException('Unauthorized to delete this comment');
    }

    (blogPost as any).comments.splice(commentIndex, 1);
    blogPost.commentsCount = Math.max(
      0,
      (blogPost.commentsCount || 0) - 1,
    );
    await blog.save();
  }

  async duplicateBlogPost(slug: string): Promise<Blog> {
    const blog = await this.blogModel.findOne().exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    const blogPost = blog.blogs.find((post) => post.slug === slug);
    if (!blogPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Create a duplicate with a new slug
    const duplicatedPost = {
      ...JSON.parse(JSON.stringify(blogPost)),
      slug: `${blogPost.slug}-copy-${Date.now()}`,
      title: `${blogPost.title} (Copy)`,
      featured: false, // Duplicated posts are not featured by default
      publishedAt: new Date().toISOString(),
      views: 0,
      likes: 0,
      commentsCount: 0,
    };

    blog.blogs.push(duplicatedPost as any);
    return blog.save();
  }

  async export(format: 'json' | 'pdf' = 'json'): Promise<any> {
    const blog = await this.blogModel.findOne().exec();
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (format === 'pdf') {
      // For PDF, return the data structure that can be converted to PDF
      // In a real implementation, you'd use a library like pdfkit or puppeteer
      return JSON.stringify(blog, null, 2);
    }

    return {
      exportedAt: new Date().toISOString(),
      blog,
    };
  }
}
