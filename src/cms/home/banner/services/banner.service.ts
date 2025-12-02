import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from '../schemas/banner.schema';
import { CreateBannerDto, UpdateBannerDto } from '../dto/banner.dto';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = new this.bannerModel(createBannerDto);
    return banner.save();
  }

  async findAll(): Promise<Banner[]> {
    return this.bannerModel.find().sort({ order: 1 }).exec();
  }

  async findActive(): Promise<Banner[]> {
    return this.bannerModel.find({ isActive: true }).sort({ order: 1 }).exec();
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id).exec();
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.bannerModel
      .findByIdAndUpdate(id, updateBannerDto, { new: true })
      .exec();
    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
    return banner;
  }

  async delete(id: string): Promise<void> {
    const result = await this.bannerModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }
  }

  async updateOrder(orders: { id: string; order: number }[]): Promise<void> {
    const bulkOps = orders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } },
      },
    }));
    await this.bannerModel.bulkWrite(bulkOps);
  }
}
