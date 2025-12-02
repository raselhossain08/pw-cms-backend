import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner } from '../schemas/banner.schema';

@Injectable()
export class BannerSeeder {
  constructor(@InjectModel(Banner.name) private bannerModel: Model<Banner>) {}

  async seed() {
    // Check if banners already exist
    const count = await this.bannerModel.countDocuments();
    if (count > 0) {
      console.log('✅ Banners already seeded');
      return;
    }

    const banners = [
      {
        title: 'High Performance Aircraft Training',
        description:
          'Master high-performance aircraft with Personal Wings. Expert instruction from Captain Rich Pickett in advanced flight operations and precision flying.',
        videoUrl: 'https://cdn.pixabay.com/video/2025/03/14/264848_large.mp4',
        thumbnail: '/thumb1/1.png',
        alt: 'High performance aircraft training with Personal Wings flight school.',
        link: '/course',
        order: 0,
        isActive: true,
        seo: {
          title: 'High Performance Aircraft Training | Personal Wings',
          description:
            'Master high-performance aircraft with expert instruction from Captain Rich Pickett. Advanced flight operations and precision flying training.',
          keywords:
            'high performance aircraft, flight training, aviation training, Captain Rich Pickett',
          ogTitle: 'High Performance Aircraft Training',
          ogDescription: 'Expert instruction in advanced flight operations',
          canonicalUrl: 'https://personalwings.com/course',
        },
      },
      {
        title: 'Turboprop & Light Jet Type Ratings',
        description:
          'Advance your aviation career with turboprop and light jet training. Professional type rating programs tailored for serious pilots.',
        videoUrl: 'https://cdn.pixabay.com/video/2025/03/18/265858_large.mp4',
        thumbnail: '/thumb1/2.png',
        alt: 'Turboprop and light jet aircraft flight training programs.',
        link: '/course',
        order: 1,
        isActive: true,
        seo: {
          title: 'Turboprop & Light Jet Type Ratings | Personal Wings',
          description:
            'Professional type rating programs for turboprop and light jet aircraft. Tailored training for serious pilots.',
          keywords:
            'turboprop training, light jet training, type rating, aviation career',
          ogTitle: 'Turboprop & Light Jet Type Ratings',
          ogDescription:
            'Advance your aviation career with professional type rating programs',
          canonicalUrl: 'https://personalwings.com/course',
        },
      },
      {
        title: 'Aircraft Brokerage & Sales Excellence',
        description:
          'Personal Wings connects you with premium high-performance, turboprop, and light jet aircraft. Expert guidance throughout your acquisition journey.',
        videoUrl:
          'https://cdn.pixabay.com/video/2022/09/01/129855-746780897_large.mp4',
        thumbnail: '/thumb1/3.png',
        alt: 'Aircraft brokerage services for high performance and jet aircraft.',
        link: '/shop',
        order: 2,
        isActive: true,
        seo: {
          title: 'Aircraft Brokerage & Sales | Personal Wings',
          description:
            'Premium aircraft brokerage services. Expert guidance for acquiring high-performance, turboprop, and light jet aircraft.',
          keywords:
            'aircraft brokerage, aircraft sales, turboprop aircraft, light jet, aircraft acquisition',
          ogTitle: 'Aircraft Brokerage & Sales Excellence',
          ogDescription:
            'Expert guidance for your aircraft acquisition journey',
          canonicalUrl: 'https://personalwings.com/shop',
        },
      },
    ];

    await this.bannerModel.insertMany(banners);
    console.log('✅ Banners seeded successfully');
  }

  async clear() {
    await this.bannerModel.deleteMany({});
    console.log('✅ Banners cleared');
  }
}
