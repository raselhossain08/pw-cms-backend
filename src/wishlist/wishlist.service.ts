import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, Cart } from './entities/wishlist.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<Wishlist>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
  ) {}

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
    itemType: 'Course' | 'Product',
    price: number,
    quantity: number = 1,
  ): Promise<Cart> {
    let cart = await this.cartModel.findOne({ user: userId });
    if (!cart) {
      cart = new this.cartModel({ user: userId, items: [] });
    }

    const existingItem = cart.items.find(
      (item) => item.itemId.toString() === itemId && item.itemType === itemType,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        itemId: new Types.ObjectId(itemId),
        itemType,
        price,
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
    return this.cartModel
      .findOne({ user: userId })
      .populate('items.itemId')
      .populate('appliedCoupon')
      .exec();
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
}
