import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponType } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { BulkDeleteDto, BulkToggleDto } from './dto/bulk-operations.dto';

@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private couponModel: Model<Coupon>) { }

  async create(data: CreateCouponDto): Promise<Coupon> {
    // Normalize code to uppercase
    const normalizedCode = data.code.toUpperCase().trim();

    // Check for duplicate code
    const existingCoupon = await this.couponModel.findOne({
      code: normalizedCode,
    });
    if (existingCoupon) {
      throw new BadRequestException(`Coupon code "${normalizedCode}" already exists`);
    }

    // Validate value based on type
    if (data.type === CouponType.PERCENTAGE && data.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    if (data.value <= 0) {
      throw new BadRequestException('Discount value must be greater than 0');
    }

    // Validate expiration date
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      throw new BadRequestException('Expiration date cannot be in the past');
    }

    const coupon = new this.couponModel({
      ...data,
      code: normalizedCode,
    });
    return await coupon.save();
  }

  async validate(
    code: string,
    amount: number,
  ): Promise<{ valid: boolean; discount: number; coupon?: Coupon; message?: string }> {
    const coupon = await this.couponModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Coupon code not found or inactive' };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, discount: 0, message: 'Coupon has expired' };
    }

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, discount: 0, message: 'Coupon usage limit reached' };
    }

    if (amount < coupon.minPurchaseAmount) {
      return {
        valid: false,
        discount: 0,
        message: `Minimum purchase amount of $${coupon.minPurchaseAmount} required`
      };
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

  async findAll(page: number = 1, limit: number = 10, search?: string): Promise<{
    data: Coupon[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    const [data, total] = await Promise.all([
      this.couponModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.couponModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Coupon> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid coupon ID format: ${id}`);
    }

    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async update(id: string, data: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    // If code is being updated, check for duplicates
    if (data.code) {
      const normalizedCode = data.code.toUpperCase().trim();
      const existingCoupon = await this.couponModel.findOne({
        code: normalizedCode,
        _id: { $ne: id },
      });
      if (existingCoupon) {
        throw new BadRequestException(`Coupon code "${normalizedCode}" already exists`);
      }
      data.code = normalizedCode;
    }

    // Validate value based on type
    if (data.type === CouponType.PERCENTAGE && data.value && data.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    if (data.value !== undefined && data.value <= 0) {
      throw new BadRequestException('Discount value must be greater than 0');
    }

    // Validate expiration date
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
      throw new BadRequestException('Expiration date cannot be in the past');
    }

    const updatedCoupon = await this.couponModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updatedCoupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return updatedCoupon;
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

  async bulkDelete(ids: string[]): Promise<{ deletedCount: number; message: string }> {
    const result = await this.couponModel.deleteMany({ _id: { $in: ids } });
    return {
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} coupon(s)`,
    };
  }

  async bulkToggleStatus(ids: string[]): Promise<{ updatedCount: number; message: string }> {
    // Get current status of first coupon to determine toggle direction
    const firstCoupon = await this.couponModel.findById(ids[0]);
    if (!firstCoupon) {
      throw new NotFoundException('No coupons found to toggle');
    }

    const newStatus = !firstCoupon.isActive;
    const result = await this.couponModel.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: newStatus } }
    );

    return {
      updatedCount: result.modifiedCount,
      message: `Successfully ${newStatus ? 'activated' : 'deactivated'} ${result.modifiedCount} coupon(s)`,
    };
  }

  async getAnalytics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    expired: number;
    scheduled: number;
    totalUses: number;
    totalRevenueSaved: number;
    mostUsed: Coupon[];
    recentCoupons: Coupon[];
  }> {
    const now = new Date();
    const [total, active, inactive, expired, scheduled, allCoupons] = await Promise.all([
      this.couponModel.countDocuments(),
      this.couponModel.countDocuments({ isActive: true, $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }] }),
      this.couponModel.countDocuments({ isActive: false }),
      this.couponModel.countDocuments({ expiresAt: { $lt: now } }),
      this.couponModel.countDocuments({ expiresAt: { $gt: now }, isActive: false }),
      this.couponModel.find().exec(),
    ]);

    const totalUses = allCoupons.reduce((sum, coupon) => sum + coupon.usedCount, 0);
    const totalRevenueSaved = allCoupons.reduce((sum, coupon) => {
      // Estimate: average order value * discount percentage/value
      // This is a simplified calculation - adjust based on your needs
      return sum + (coupon.usedCount * (coupon.type === CouponType.PERCENTAGE ? 50 : coupon.value));
    }, 0);

    const mostUsed = await this.couponModel
      .find()
      .sort({ usedCount: -1 })
      .limit(5)
      .exec();

    const recentCoupons = await this.couponModel
      .find()
      .sort({ createdAt: -1 })
      .limit(5)
      .exec();

    return {
      total,
      active,
      inactive,
      expired,
      scheduled,
      totalUses,
      totalRevenueSaved,
      mostUsed,
      recentCoupons,
    };
  }
}
