import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProductCategory,
  ProductCategorySchema,
} from './entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { GetProductCategoriesDto } from './dto/get-product-categories.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductCategoriesService {
  constructor(
    @InjectModel(ProductCategory.name)
    private categoryModel: Model<ProductCategory>,
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) { }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Get all categories with pagination and filters
   */
  async findAll(
    params: GetProductCategoriesDto,
  ): Promise<{
    categories: ProductCategory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      parentCategory,
      sortBy = 'name',
      sortOrder = 'asc',
    } = params;

    const skip = (page - 1) * limit;
    const query: any = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    // Parent category filter
    if (parentCategory) {
      if (parentCategory === 'null' || parentCategory === '') {
        query.parentCategory = null;
      } else {
        query.parentCategory = new Types.ObjectId(parentCategory);
      }
    }

    // Sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .populate('parentCategory', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(query),
    ]);

    // Get product counts and subcategory counts
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const productCount = await this.productModel.countDocuments({
          category: category._id,
        });
        const subcategoryCount = await this.categoryModel.countDocuments({
          parentCategory: category._id,
        });

        return {
          ...category.toObject(),
          productCount,
          subcategoryCount,
        };
      }),
    );

    return {
      categories: categoriesWithCounts as any,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get category by ID
   */
  async findOne(id: string): Promise<ProductCategory> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid category ID');
    }

    const category = await this.categoryModel
      .findById(id)
      .populate('parentCategory', 'name slug')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Get counts
    const productCount = await this.productModel.countDocuments({
      category: category._id,
    });
    const subcategoryCount = await this.categoryModel.countDocuments({
      parentCategory: category._id,
    });

    return {
      ...category.toObject(),
      productCount,
      subcategoryCount,
    } as any;
  }

  /**
   * Create a new category
   */
  async create(
    createDto: CreateProductCategoryDto,
  ): Promise<ProductCategory> {
    // Generate slug if not provided
    const slug = this.generateSlug(createDto.name);

    // Check if slug already exists
    const existingCategory = await this.categoryModel.findOne({ slug });
    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    // Validate parent category if provided
    if (createDto.parentCategory) {
      const parent = await this.categoryModel.findById(
        createDto.parentCategory,
      );
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const category = new this.categoryModel({
      ...createDto,
      slug,
      status: createDto.status || 'active',
    });

    const saved = await category.save();

    // Update parent's subcategory count
    if (saved.parentCategory) {
      await this.categoryModel.findByIdAndUpdate(saved.parentCategory, {
        $inc: { subcategoryCount: 1 },
      });
    }

    return saved;
  }

  /**
   * Update a category
   */
  async update(
    id: string,
    updateDto: UpdateProductCategoryDto,
  ): Promise<ProductCategory> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prepare update data
    const updateData: any = { ...updateDto };

    // If name is being updated, generate new slug
    if (updateDto.name && updateDto.name !== category.name) {
      const newSlug = this.generateSlug(updateDto.name);
      const existingCategory = await this.categoryModel.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });
      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
      updateData.slug = newSlug;
    }

    // Validate parent category if being updated
    if (updateDto.parentCategory !== undefined) {
      if (updateDto.parentCategory) {
        if (updateDto.parentCategory === id) {
          throw new BadRequestException(
            'Category cannot be its own parent',
          );
        }
        const parent = await this.categoryModel.findById(
          updateDto.parentCategory,
        );
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }
      }

      // Update subcategory counts
      const oldParent = category.parentCategory;
      if (oldParent && oldParent.toString() !== updateDto.parentCategory) {
        await this.categoryModel.findByIdAndUpdate(oldParent, {
          $inc: { subcategoryCount: -1 },
        });
      }
      if (updateDto.parentCategory) {
        await this.categoryModel.findByIdAndUpdate(updateDto.parentCategory, {
          $inc: { subcategoryCount: 1 },
        });
      }
    }

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('parentCategory', 'name slug')
      .exec();

    if (!updated) {
      throw new NotFoundException('Category not found after update');
    }

    return updated;
  }

  /**
   * Delete a category
   */
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has products
    const productCount = await this.productModel.countDocuments({
      category: id,
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productCount} associated products`,
      );
    }

    // Check if category has subcategories
    const subcategoryCount = await this.categoryModel.countDocuments({
      parentCategory: id,
    });
    if (subcategoryCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${subcategoryCount} subcategories`,
      );
    }

    // Update parent's subcategory count
    if (category.parentCategory) {
      await this.categoryModel.findByIdAndUpdate(category.parentCategory, {
        $inc: { subcategoryCount: -1 },
      });
    }

    await this.categoryModel.findByIdAndDelete(id);
  }

  /**
   * Get top-level categories (no parent)
   */
  async getTopLevelCategories(): Promise<ProductCategory[]> {
    return this.categoryModel
      .find({ parentCategory: null, status: 'active' })
      .sort({ order: 1, name: 1 })
      .exec();
  }

  /**
   * Get subcategories of a parent category
   */
  async getSubcategories(parentId: string): Promise<ProductCategory[]> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new NotFoundException('Invalid parent category ID');
    }

    return this.categoryModel
      .find({ parentCategory: parentId, status: 'active' })
      .sort({ order: 1, name: 1 })
      .exec();
  }

  /**
   * Bulk update category status
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'active' | 'inactive',
  ): Promise<{ updated: number }> {
    const result = await this.categoryModel.updateMany(
      { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } },
      { $set: { status } },
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Bulk delete categories
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.remove(id);
        deleted++;
      } catch (error) {
        errors.push(`${id}: ${error.message}`);
      }
    }

    return { deleted, errors };
  }
}
