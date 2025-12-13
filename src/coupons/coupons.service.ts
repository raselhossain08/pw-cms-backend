import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponType } from './entities/coupon.entity';

@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private couponModel: Model<Coupon>) { }

  async create(data: {
    code: string;
    type: CouponType;
    value: number;
    expiresAt?: Date;
    maxUses?: number;
    minPurchaseAmount?: number;
  }): Promise<Coupon> {
    const coupon = new this.couponModel(data);
    return await coupon.save();
  }

  async validate(
    code: string,
    amount: number,
  ): Promise<{ valid: boolean; discount: number; coupon?: Coupon }> {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return { valid: false, discount: 0 };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, discount: 0 };
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discount: 0 };
    }

    if (amount < coupon.minPurchaseAmount) {
      return { valid: false, discount: 0 };
    }

    const discount =
      coupon.type === CouponType.PERCENTAGE
        ? (amount * coupon.value) / 100
        : coupon.value;

    return { valid: true, discount, coupon };
  }

  async applyCoupon(code: string): Promise<Coupon | null> {
    const coupon = await this.couponModel.findOne({ code: code.toUpperCase() });
    if (coupon) {
      coupon.usedCount++;
      await coupon.save();
    }
    return coupon;
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async update(id: string, data: Partial<{
    code: string;
    type: CouponType;
    value: number;
    expiresAt?: Date;
    maxUses?: number;
    minPurchaseAmount?: number;
    isActive?: boolean;
  }>): Promise<Coupon> {
    const coupon = await this.couponModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async toggleStatus(id: string): Promise<Coupon> {
    const coupon = await this.findOne(id);
    coupon.isActive = !coupon.isActive;
    return await coupon.save();
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.couponModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return { message: 'Coupon deleted successfully' };
  }
}
