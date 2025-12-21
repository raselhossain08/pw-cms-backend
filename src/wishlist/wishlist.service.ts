import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, Cart } from './entities/wishlist.entity';
import { CoursesService } from '../courses/courses.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<Wishlist>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    private coursesService: CoursesService,
    private productsService: ProductsService,
  ) { }

  async addToWishlist(userId: string, courseId: string): Promise<Wishlist> {
    let wishlist = await this.wishlistModel.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new this.wishlistModel({ user: userId, courses: [] });
    }

    const courseObjectId = new Types.ObjectId(courseId);
    if (!wishlist.courses.some((id) => id.toString() === courseId)) {
      wishlist.courses.push(courseObjectId);
    }

    return await wishlist.save();
  }

  async removeFromWishlist(
    userId: string,
    courseId: string,
  ): Promise<Wishlist | null> {
    const wishlist = await this.wishlistModel.findOne({ user: userId });
    if (wishlist) {
      wishlist.courses = wishlist.courses.filter(
        (id) => id.toString() !== courseId,
      );
      await wishlist.save();
    }
    return wishlist;
  }

  async getWishlist(userId: string): Promise<Wishlist | null> {
    return this.wishlistModel
      .findOne({ user: userId })
      .populate('courses')
      .exec();
  }

  async addToCart(
    userId: string,
    itemId: string,
    itemType: 'Course' | 'Product' | 'course' | 'product',
    price?: number,
    quantity: number = 1,
    courseId?: string,
    productId?: string,
  ): Promise<Cart> {
    // Normalize itemType
    const normalizedItemType =
      itemType === 'course' || itemType === 'Course' ? 'Course' : 'Product';

    // If price not provided, fetch from course/product
    let finalPrice = price;
    let finalItemId = itemId;

    if (!finalPrice || !finalItemId) {
      if (courseId) {
        const course = await this.coursesService.findById(courseId);
        finalPrice = course.price;
        finalItemId = courseId;
      } else if (productId) {
        const product = await this.productsService.findById(productId);
        finalPrice = product.price;
        finalItemId = productId;
      } else if (itemId) {
        // Try to fetch price if itemId provided but price not
        if (normalizedItemType === 'Course') {
          const course = await this.coursesService.findById(itemId);
          finalPrice = course.price;
        } else {
          const product = await this.productsService.findById(itemId);
          finalPrice = product.price;
        }
      } else {
        throw new BadRequestException(
          'Either courseId, productId, or itemId with price must be provided',
        );
      }
    }

    let cart = await this.cartModel.findOne({ user: userId });
    if (!cart) {
      cart = new this.cartModel({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.itemId.toString() === finalItemId &&
        item.itemType === normalizedItemType,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        itemId: new Types.ObjectId(finalItemId),
        itemType: normalizedItemType,
        price: finalPrice,
        quantity,
      } as any);
    }

    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return await cart.save();
  }

  async getCart(userId: string): Promise<Cart | null> {
    const cart = await this.cartModel
      .findOne({ user: userId })
      .populate('appliedCoupon')
      .lean()
      .exec();

    if (!cart) {
      return null;
    }

    // Manually populate items based on itemType
    const populatedItems = await Promise.all(
      cart.items.map(async (item: any) => {
        if (item.itemType === 'Course') {
          const course = await this.coursesService.findById(
            item.itemId.toString(),
          );
          return {
            ...item,
            course: course,
            itemId: item.itemId,
          };
        } else if (item.itemType === 'Product') {
          const product = await this.productsService.findById(
            item.itemId.toString(),
          );
          return {
            ...item,
            product: product,
            itemId: item.itemId,
          };
        }
        return item;
      }),
    );

    return {
      ...cart,
      items: populatedItems,
    } as any;
  }

  async removeFromCart(userId: string, itemId: string): Promise<Cart | null> {
    const cart = await this.cartModel.findOne({ user: userId });
    if (cart) {
      cart.items = cart.items.filter(
        (item) => item.itemId.toString() !== itemId,
      );
      cart.totalAmount = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      await cart.save();
    }
    return cart;
  }

  async clearCart(userId: string): Promise<void> {
    await this.cartModel.findOneAndUpdate(
      { user: userId },
      { items: [], totalAmount: 0, discount: 0, appliedCoupon: null },
    );
  }

  async updateCartItemQuantity(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart | null> {
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.items.find(
      (item) => item.itemId.toString() === itemId,
    );
    if (!item) {
      throw new NotFoundException('Item not found in cart');
    }

    item.quantity = quantity;
    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return await cart.save();
  }

  async getCartCount(userId: string): Promise<{ count: number }> {
    const cart = await this.cartModel.findOne({ user: userId });
    if (!cart) {
      return { count: 0 };
    }

    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return { count };
  }
}
