import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TopBar, TopBarDocument } from '../schemas/top-bar.schema';
import { CreateTopBarDto, UpdateTopBarDto } from '../dto/top-bar.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@Injectable()
export class TopBarService {
  constructor(
    @InjectModel(TopBar.name)
    private topBarModel: Model<TopBarDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createDto: CreateTopBarDto): Promise<TopBar> {
    const created = new this.topBarModel(createDto);
    return created.save();
  }

  async findAll(): Promise<TopBar[]> {
    const docs = await this.topBarModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => doc.toJSON());
  }

  async findActive(): Promise<TopBar> {
    const now = Date.now();
    if ((this as any)._activeCache && (this as any)._activeCacheExpires > now) {
      return (this as any)._activeCache;
    }
    const active = await this.topBarModel.findOne({ isActive: true }).exec();

    if (!active) {
      throw new NotFoundException('No active top bar found');
    }

    const jsonData = active.toJSON();
    (this as any)._activeCache = jsonData;
    (this as any)._activeCacheExpires = now + 1000 * 15;
    return jsonData;
  }

  async findOne(id: string): Promise<TopBar> {
    const topBar = await this.topBarModel.findById(id).exec();

    if (!topBar) {
      throw new NotFoundException(`Top bar #${id} not found`);
    }

    return topBar.toJSON();
  }

  async update(id: string, updateDto: UpdateTopBarDto): Promise<TopBar> {
    const updated = await this.topBarModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Top bar #${id} not found`);
    }

    return updated.toJSON();
  }

  async remove(id: string): Promise<void> {
    const result = await this.topBarModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException(`Top bar #${id} not found`);
    }
  }

  async setActive(id: string): Promise<TopBar> {
    // Deactivate all
    await this.topBarModel.updateMany({}, { isActive: false });

    // Activate the selected one
    const activated = await this.topBarModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!activated) {
      throw new NotFoundException(`Top bar #${id} not found`);
    }

    return activated.toJSON();
  }

  async uploadNewsIcon(id: string, file: Express.Multer.File): Promise<TopBar> {
    await this.findOne(id);

    const image = await this.cloudinaryService.uploadImage(
      file,
      'topbar/icons',
    );

    const result = await this.topBarModel
      .findByIdAndUpdate(id, { 'news.icon': image.url }, { new: true })
      .exec();
    if (!result) throw new NotFoundException('Top bar not found');
    return result.toJSON();
  }

  async uploadLanguageFlag(
    id: string,
    languageCode: string,
    file: Express.Multer.File,
  ): Promise<TopBar> {
    const topBar = await this.findOne(id);

    const languageIndex = topBar.languages.findIndex(
      (lang) => lang.code === languageCode,
    );

    if (languageIndex === -1) {
      throw new NotFoundException(`Language ${languageCode} not found`);
    }

    const image = await this.cloudinaryService.uploadImage(
      file,
      'topbar/flags',
    );

    const updateKey = `languages.${languageIndex}.flag`;

    const result = await this.topBarModel
      .findByIdAndUpdate(id, { [updateKey]: image.url }, { new: true })
      .exec();
    if (!result) throw new NotFoundException('Top bar not found');
    return result.toJSON();
  }
}
