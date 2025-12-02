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
  ) {}

  async create(createBlogDto: CreateBlogDto): Promise<Blog> {
    const blog = new this.blogModel(createBlogDto);
    return blog.save();
  }

  async findOne(): Promise<Blog | null> {
    return this.blogModel.findOne({ isActive: true }).exec();
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
}
