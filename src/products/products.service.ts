import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductStatus, ProductType } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<Product> {
    // Check if slug already exists
    const existingProduct = await this.productModel.findOne({
      slug: createProductDto.slug,
    });
    if (existingProduct) {
      throw new ConflictException('Product with this slug already exists');
    }

    const product = new this.productModel({
      ...createProductDto,
      seller: new Types.ObjectId(sellerId),
    });

    return await product.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    type?: ProductType,
    status?: ProductStatus,
    category?: string,
    search?: string,
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (category) {
      query.aircraftCategory = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(query)
        .populate('seller', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(query),
    ]);

    return { products, total };
  }

  async findById(id: string): Promise<Product> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Product not found');
    }

    const product = await this.productModel
      .findById(id)
      .populate(
        'seller',
        'firstName lastName email phone avatar certifications flightHours',
      )
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ slug, status: ProductStatus.PUBLISHED })
      .populate(
        'seller',
        'firstName lastName email phone avatar certifications flightHours',
      )
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Product> {
    const product = await this.findById(id);

    // Check if user is seller or admin
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      product.seller.toString() !== userId
    ) {
      throw new ForbiddenException('You can only update your own products');
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existingProduct = await this.productModel.findOne({
        slug: updateProductDto.slug,
        _id: { $ne: id },
      });
      if (existingProduct) {
        throw new ConflictException('Product with this slug already exists');
      }
    }

    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .populate('seller', 'firstName lastName email phone')
      .exec();

    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    return updatedProduct;
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const product = await this.findById(id);

    // Check if user is seller or admin
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.SUPER_ADMIN &&
      product.seller.toString() !== userId
    ) {
      throw new ForbiddenException('You can only delete your own products');
    }

    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Product not found');
    }
  }

  async getFeaturedProducts(limit: number = 6): Promise<Product[]> {
    return await this.productModel
      .find({
        status: ProductStatus.PUBLISHED,
        isFeatured: true,
      })
      .populate('seller', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getSellerProducts(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productModel
        .find({ seller: sellerId })
        .populate('seller', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments({ seller: sellerId }),
    ]);

    return { products, total };
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.productModel.findByIdAndUpdate(id, {
      $inc: { viewCount: 1 },
    });
  }

  async incrementInquiryCount(id: string): Promise<void> {
    await this.productModel.findByIdAndUpdate(id, {
      $inc: { inquiryCount: 1 },
    });
  }

  async updateRating(id: string, newRating: number): Promise<void> {
    const product = await this.findById(id);

    const totalRating = product.rating * product.reviewCount + newRating;
    const newReviewCount = product.reviewCount + 1;
    const averageRating = totalRating / newReviewCount;

    await this.productModel.findByIdAndUpdate(id, {
      rating: averageRating,
      reviewCount: newReviewCount,
    });
  }

  async getProductStats(): Promise<any> {
    const totalProducts = await this.productModel.countDocuments();
    const publishedProducts = await this.productModel.countDocuments({
      status: ProductStatus.PUBLISHED,
    });
    const totalAircraft = await this.productModel.countDocuments({
      type: ProductType.AIRCRAFT,
    });
    const totalSold = await this.productModel.countDocuments({
      status: ProductStatus.SOLD,
    });

    const revenueStats = await this.productModel.aggregate([
      { $match: { status: ProductStatus.SOLD } },
      { $group: { _id: null, totalRevenue: { $sum: '$price' } } },
    ]);

    return {
      totalProducts,
      publishedProducts,
      totalAircraft,
      totalSold,
      totalRevenue: revenueStats[0]?.totalRevenue || 0,
      averagePrice: await this.getAveragePrice(),
    };
  }

  private async getAveragePrice(): Promise<number> {
    const result = await this.productModel.aggregate([
      { $match: { status: ProductStatus.PUBLISHED } },
      { $group: { _id: null, averagePrice: { $avg: '$price' } } },
    ]);

    return result[0]?.averagePrice || 0;
  }

  async searchProducts(query: string, filters: any = {}): Promise<Product[]> {
    const searchQuery: any = {
      status: ProductStatus.PUBLISHED,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { manufacturer: { $regex: query, $options: 'i' } },
        { model: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    };

    // Apply filters
    if (filters.type) searchQuery.type = filters.type;
    if (filters.category) searchQuery.aircraftCategory = filters.category;
    if (filters.minPrice)
      searchQuery.price = { ...searchQuery.price, $gte: filters.minPrice };
    if (filters.maxPrice)
      searchQuery.price = { ...searchQuery.price, $lte: filters.maxPrice };
    if (filters.minYear)
      searchQuery.year = { ...searchQuery.year, $gte: filters.minYear };
    if (filters.maxYear)
      searchQuery.year = { ...searchQuery.year, $lte: filters.maxYear };

    return await this.productModel
      .find(searchQuery)
      .populate('seller', 'firstName lastName email phone')
      .sort({ isFeatured: -1, createdAt: -1 })
      .exec();
  }
}
