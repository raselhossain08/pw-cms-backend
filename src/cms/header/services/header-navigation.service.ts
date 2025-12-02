import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HeaderNavigation,
  HeaderNavigationDocument,
} from '../schemas/header-navigation.schema';
import {
  CreateHeaderNavigationDto,
  UpdateHeaderNavigationDto,
} from '../dto/header-navigation.dto';
import { CloudinaryService } from '../../services/cloudinary.service';

@Injectable()
export class HeaderNavigationService {
  constructor(
    @InjectModel(HeaderNavigation.name)
    private headerNavigationModel: Model<HeaderNavigationDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createDto: CreateHeaderNavigationDto,
  ): Promise<HeaderNavigation> {
    const created = new this.headerNavigationModel(createDto);
    return created.save();
  }

  async findAll(): Promise<HeaderNavigation[]> {
    const docs = await this.headerNavigationModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => doc.toJSON());
  }

  async findActive(): Promise<HeaderNavigation> {
    const now = Date.now();
    if ((this as any)._activeCache && (this as any)._activeCacheExpires > now) {
      return (this as any)._activeCache;
    }
    const active = await this.headerNavigationModel
      .findOne({ isActive: true })
      .exec();

    if (!active) {
      throw new NotFoundException('No active header navigation found');
    }

    const jsonData = active.toJSON();
    (this as any)._activeCache = jsonData;
    (this as any)._activeCacheExpires = now + 1000 * 15;
    return jsonData;
  }

  async findOne(id: string): Promise<HeaderNavigation> {
    const headerNav = await this.headerNavigationModel.findById(id).exec();

    if (!headerNav) {
      throw new NotFoundException(`Header navigation #${id} not found`);
    }

    return headerNav.toJSON();
  }

  async update(
    id: string,
    updateDto: UpdateHeaderNavigationDto,
  ): Promise<HeaderNavigation> {
    const updated = await this.headerNavigationModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Header navigation #${id} not found`);
    }

    return updated.toJSON();
  }

  async remove(id: string): Promise<void> {
    const result = await this.headerNavigationModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException(`Header navigation #${id} not found`);
    }
  }

  async setActive(id: string): Promise<HeaderNavigation> {
    // Deactivate all
    await this.headerNavigationModel.updateMany({}, { isActive: false });

    // Activate the selected one
    const activated = await this.headerNavigationModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!activated) {
      throw new NotFoundException(`Header navigation #${id} not found`);
    }

    return activated.toJSON();
  }

  async uploadLogo(
    id: string,
    files: { dark?: Express.Multer.File[]; light?: Express.Multer.File[] },
  ): Promise<HeaderNavigation> {
    const headerNav = await this.findOne(id);

    const updates: any = {};

    if (files.dark && files.dark[0]) {
      const darkLogo = await this.cloudinaryService.uploadImage(
        files.dark[0],
        'header/logos',
      );
      updates['logo.dark'] = darkLogo.url;
    }

    if (files.light && files.light[0]) {
      const lightLogo = await this.cloudinaryService.uploadImage(
        files.light[0],
        'header/logos',
      );
      updates['logo.light'] = lightLogo.url;
    }

    const result = await this.headerNavigationModel
      .findByIdAndUpdate(id, updates, { new: true })
      .exec();
    if (!result) throw new BadRequestException('Header navigation not found');
    return result.toJSON();
  }

  async uploadFeaturedImage(
    id: string,
    menuIndex: number,
    file: Express.Multer.File,
  ): Promise<HeaderNavigation> {
    const headerNav = await this.findOne(id);

    if (!headerNav.navigation.menuItems[menuIndex]) {
      throw new BadRequestException('Menu item not found');
    }

    const image = await this.cloudinaryService.uploadImage(
      file,
      'header/featured',
    );

    const updateKey = `navigation.menuItems.${menuIndex}.featured.image`;

    const result = await this.headerNavigationModel
      .findByIdAndUpdate(id, { [updateKey]: image.url }, { new: true })
      .exec();
    if (!result) throw new BadRequestException('Header navigation not found');
    return result.toJSON();
  }

  async uploadUserAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<HeaderNavigation> {
    await this.findOne(id);

    const image = await this.cloudinaryService.uploadImage(
      file,
      'header/avatars',
    );

    const result = await this.headerNavigationModel
      .findByIdAndUpdate(
        id,
        { 'userMenu.profile.avatar': image.url },
        { new: true },
      )
      .exec();
    if (!result) throw new BadRequestException('Header navigation not found');
    return result.toJSON();
  }

  async uploadSeoImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<HeaderNavigation> {
    await this.findOne(id);

    const image = await this.cloudinaryService.uploadImage(file, 'header/seo');

    const result = await this.headerNavigationModel
      .findByIdAndUpdate(id, { 'seo.ogImage': image.url }, { new: true })
      .exec();
    if (!result) throw new BadRequestException('Header navigation not found');
    return result.toJSON();
  }
}
