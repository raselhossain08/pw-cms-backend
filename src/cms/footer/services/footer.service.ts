import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Footer, FooterDocument } from '../schemas/footer.schema';
import { CreateFooterDto, UpdateFooterDto } from '../dto/footer.dto';

@Injectable()
export class FooterService {
  constructor(
    @InjectModel(Footer.name) private footerModel: Model<FooterDocument>,
  ) {}

  async findAll(): Promise<Footer[]> {
    return this.footerModel.find().lean();
  }

  async findActive(): Promise<Footer | null> {
    return this.footerModel.findOne({ isActive: true }).lean();
  }

  async findById(id: string): Promise<Footer> {
    const doc = await this.footerModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Footer not found');
    return doc as Footer;
  }

  async create(
    payload: CreateFooterDto & {
      logoUpload?: { url: string; publicId: string };
    },
  ): Promise<Footer> {
    const toCreate: any = { ...payload };
    if (payload.logoUpload) {
      toCreate.logo = {
        src: payload.logoUpload.url,
        publicId: payload.logoUpload.publicId,
        alt: payload.logo.alt,
        width: payload.logo.width,
        height: payload.logo.height,
      };
    }
    const created = await this.footerModel.create(toCreate);
    return created.toObject() as Footer;
  }

  async update(
    id: string,
    payload: UpdateFooterDto & {
      logoUpload?: { url: string; publicId: string };
    },
  ): Promise<Footer> {
    const existing = await this.footerModel.findById(id);
    if (!existing) throw new NotFoundException('Footer not found');

    const update: any = { ...payload };
    if (payload.logoUpload && existing.logo) {
      update.logo = {
        src: payload.logoUpload.url,
        publicId: payload.logoUpload.publicId,
        alt: payload.logo?.alt ?? existing.logo.alt,
        width: payload.logo?.width ?? existing.logo.width,
        height: payload.logo?.height ?? existing.logo.height,
      };
    }

    await existing.updateOne(update);
    const refreshed = await this.footerModel.findById(id).lean();
    return refreshed as Footer;
  }

  async setActive(id: string): Promise<Footer> {
    await this.footerModel.updateMany({ isActive: true }, { isActive: false });
    await this.footerModel.findByIdAndUpdate(id, { isActive: true });
    const doc = await this.footerModel.findById(id).lean();
    if (!doc) throw new NotFoundException('Footer not found');
    return doc as Footer;
  }
}
