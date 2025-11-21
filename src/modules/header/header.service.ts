// src/modules/header/header.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Header } from './entities/header.entity';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';

@Injectable()
export class HeaderService {
    constructor(
        @InjectModel(Header.name)
        private readonly headerModel: Model<Header>,
    ) { }

    /**
     * Get the active header (singleton pattern - only one header exists)
     * Optimized with lean() for better performance and caching
     */
    async findActive(): Promise<Header> {
        let header = await this.headerModel
            .findOne({ enabled: true })
            .sort({ updatedAt: -1 })
            .lean() // Returns plain JavaScript objects instead of Mongoose documents for better performance
            .exec();

        // If no header exists, create a default one
        if (!header) {
            const headers = await this.headerModel.find().lean().exec();
            if (headers.length > 0) {
                header = headers[0];
            } else {
                throw new NotFoundException('No header configuration found. Please run seed command.');
            }
        }

        return header as unknown as Header;
    }

    /**
     * Update the active header with partial data
     */
    async updateActive(updateHeaderDto: UpdateHeaderDto): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: updateHeaderDto },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update header');
        }

        return updated;
    }

    /**
     * Update only the logo section
     */
    async updateLogo(logoDto: UpdateLogoDto): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { logo: logoDto } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update logo');
        }

        return updated;
    }

    /**
     * Update only the topbar section
     */
    async updateTopBar(topBarData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { topBar: topBarData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update topbar');
        }

        return updated;
    }

    /**
     * Update only the navigation section
     */
    async updateNavigation(navigationData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { navigation: navigationData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update navigation');
        }

        return updated;
    }

    /**
     * Update only the cart section
     */
    async updateCart(cartData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { cart: cartData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update cart');
        }

        return updated;
    }

    /**
     * Update only the user menu section
     */
    async updateUserMenu(userMenuData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { userMenu: userMenuData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update user menu');
        }

        return updated;
    }

    /**
     * Update only the SEO section
     */
    async updateSEO(seoData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { seo: seoData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update SEO metadata');
        }

        return updated;
    }

    /**
     * Update only the theme section
     */
    async updateTheme(themeData: any): Promise<Header> {
        const activeHeader = await this.findActive();

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                { $set: { theme: themeData } },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update theme');
        }

        return updated;
    }

    /**
     * Reorder navigation menu items
     */
    async updateMenuOrder(orderDto: UpdateMenuOrderDto): Promise<Header> {
        const activeHeader = await this.findActive();

        if (!activeHeader.navigation || !activeHeader.navigation.menuItems) {
            throw new NotFoundException('No navigation menu items found');
        }

        // Create a map of positions
        const positionMap = new Map(
            orderDto.menuItems.map(item => [item.id, item.position])
        );

        // Reorder menu items based on the provided positions
        const reorderedItems = [...activeHeader.navigation.menuItems].sort((a, b) => {
            const posA = positionMap.get(a.title) ?? 999;
            const posB = positionMap.get(b.title) ?? 999;
            return posA - posB;
        });

        const updated = await this.headerModel
            .findByIdAndUpdate(
                activeHeader._id,
                {
                    $set: {
                        'navigation.menuItems': reorderedItems
                    }
                },
                { new: true }
            )
            .exec();

        if (!updated) {
            throw new NotFoundException('Failed to update menu order');
        }

        return updated;
    }
}