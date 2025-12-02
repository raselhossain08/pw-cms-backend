import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseCategory } from './entities/course-category.entity';

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  image?: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  image?: string;
  icon?: string;
  isActive?: boolean;
}

export interface GetCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'courseCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class CourseCategoriesService {
  constructor(
    @InjectModel(CourseCategory.name)
    private categoryModel: Model<CourseCategory>,
  ) {}

  async listActiveNames(): Promise<string[]> {
    const rows = await this.categoryModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
    return rows.map((r) => r.name);
  }

  async getAllWithCourseCount(params: GetCategoriesParams = {}) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    const query: any = {};
    if (isActive !== undefined) query.isActive = isActive;
    if (search) query.name = { $regex: search, $options: 'i' };

    const skip = (page - 1) * limit;
    const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.categoryModel.countDocuments(query).exec(),
    ]);

    // Add courseCount from Course model (assuming Course has categoryId)
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        // TODO: Add actual course count when Course model is available
        const courseCount = 0;
        return { ...cat, courseCount };
      }),
    );

    return {
      categories: categoriesWithCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFeatured(limit = 5) {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ name: 1 })
      .limit(limit)
      .lean()
      .exec();

    // Add courseCount
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const courseCount = 0; // TODO: Add actual course count
        return { ...cat, courseCount };
      }),
    );

    return categoriesWithCount;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug }).lean().exec();
    if (!category) throw new NotFoundException('Category not found');
    const courseCount = 0; // TODO: Add actual course count
    return { ...category, courseCount };
  }

  async findById(id: string) {
    const category = await this.categoryModel.findById(id).lean().exec();
    if (!category) throw new NotFoundException('Category not found');
    const courseCount = 0; // TODO: Add actual course count
    return { ...category, courseCount };
  }

  async add(dto: CreateCategoryDto) {
    const clean = dto.name?.trim();
    if (!clean) throw new BadRequestException('Category name is required');
    const slug = slugify(clean);
    const exists = await this.categoryModel
      .findOne({ $or: [{ name: clean }, { slug }] })
      .lean()
      .exec();
    if (exists) return exists; // idempotent
    return this.categoryModel.create({
      name: clean,
      slug,
      description: dto.description,
      image: dto.image,
      icon: dto.icon,
      isActive: true,
    });
  }

  async update(slug: string, dto: UpdateCategoryDto) {
    const update: any = {};
    if (dto.name) {
      update.name = dto.name.trim();
      update.slug = slugify(dto.name);
    }
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.image !== undefined) update.image = dto.image;
    if (dto.icon !== undefined) update.icon = dto.icon;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    const category = await this.categoryModel
      .findOneAndUpdate({ slug }, update, { new: true })
      .lean()
      .exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async removeBySlug(slug: string) {
    const res = await this.categoryModel
      .findOneAndDelete({ slug })
      .lean()
      .exec();
    if (!res) throw new NotFoundException('Category not found');
    return { success: true };
  }
}
