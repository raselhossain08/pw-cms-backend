import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AboutUs } from '../schemas/about-us.schema';
import { CreateAboutUsDto, UpdateAboutUsDto } from '../dto/about-us.dto';

@Injectable()
export class AboutUsService {
  constructor(
    @InjectModel(AboutUs.name)
    private aboutUsModel: Model<AboutUs>,
  ) {}

  async create(createAboutUsDto: CreateAboutUsDto): Promise<AboutUs> {
    const createdAboutUs = new this.aboutUsModel(createAboutUsDto);
    return createdAboutUs.save();
  }

  async findAll(): Promise<AboutUs[]> {
    return this.aboutUsModel.find().exec();
  }

  async findActive(): Promise<AboutUs | null> {
    return this.aboutUsModel.findOne({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<AboutUs | null> {
    return this.aboutUsModel.findById(id).exec();
  }

  async update(
    id: string,
    updateAboutUsDto: UpdateAboutUsDto,
  ): Promise<AboutUs | null> {
    return this.aboutUsModel
      .findByIdAndUpdate(id, updateAboutUsDto, { new: true })
      .exec();
  }

  async delete(id: string): Promise<AboutUs | null> {
    return this.aboutUsModel.findByIdAndDelete(id).exec();
  }

  async getOrCreateDefault(): Promise<AboutUs> {
    const existingAboutUs = await this.aboutUsModel.findOne().exec();
    if (existingAboutUs) {
      return existingAboutUs;
    }

    const defaultAboutUs: CreateAboutUsDto = {
      headerSection: {
        title: 'About Us',
        subtitle: 'LEARN MORE ABOUT PERSONAL WINGS',
        image: '',
        imageAlt: 'About Personal Wings',
      },
      sections: [
        {
          id: 'mission',
          title: 'Our Mission',
          content:
            '<p>At Personal Wings, we are dedicated to providing exceptional aviation training and education. Our mission is to empower aspiring aviators with the knowledge, skills, and confidence they need to soar in their careers.</p><p>We believe in combining traditional aviation expertise with modern teaching methodologies to create a comprehensive learning experience that prepares students for real-world challenges.</p>',
          isActive: true,
          order: 1,
        },
        {
          id: 'vision',
          title: 'Our Vision',
          content:
            '<p>To become the leading aviation training institution, recognized globally for excellence in education, innovation, and student success.</p><p>We envision a future where every student who passes through our programs emerges as a confident, skilled, and safety-conscious aviation professional.</p>',
          isActive: true,
          order: 2,
        },
        {
          id: 'values',
          title: 'Our Values',
          content:
            '<ul><li><strong>Excellence:</strong> We strive for the highest standards in everything we do</li><li><strong>Safety First:</strong> Safety is our top priority in all training programs</li><li><strong>Innovation:</strong> We embrace new technologies and teaching methods</li><li><strong>Integrity:</strong> We conduct our business with honesty and transparency</li><li><strong>Student Success:</strong> Your success is our success</li></ul>',
          isActive: true,
          order: 3,
        },
      ],
      seo: {
        title: 'About Us | Personal Wings - Professional Aviation Training',
        description:
          'Discover Personal Wings: professional flight training, aviation writing, and safety-focused education. Learn about our mission, values, and commitment to excellence in aviation training.',
        keywords: [
          'about personal wings',
          'aviation training company',
          'flight school about',
          'personal wings mission',
          'aviation education',
          'flight training history',
        ],
        ogTitle: 'About Us | Personal Wings',
        ogDescription:
          'Learn about Personal Wings and our commitment to excellence in aviation training.',
        ogImage: '',
        canonicalUrl: 'https://personalwings.com/about-us',
      },
      isActive: true,
    };

    const createdAboutUs = new this.aboutUsModel(defaultAboutUs);
    return createdAboutUs.save();
  }

  async toggleActive(id: string): Promise<AboutUs | null> {
    const aboutUs = await this.aboutUsModel.findById(id).exec();
    if (!aboutUs) {
      return null;
    }
    aboutUs.isActive = !aboutUs.isActive;
    return aboutUs.save();
  }

  async duplicate(id: string): Promise<AboutUs | null> {
    const original = await this.aboutUsModel.findById(id).exec();
    if (!original) {
      return null;
    }

    // Create a copy with modified title
    const duplicatedData: CreateAboutUsDto = {
      headerSection: {
        ...original.headerSection,
        title: `${original.headerSection.title} (Copy)`,
      },
      sections: original.sections.map((section) => ({
        ...section,
        id: `${section.id}-copy`,
      })),
      teamSection: original.teamSection
        ? {
            ...original.teamSection,
            members: original.teamSection.members?.map((member) => ({
              ...member,
              id: `${member.id}-copy`,
            })),
          }
        : undefined,
      statsSection: original.statsSection
        ? { ...original.statsSection }
        : undefined,
      seo: {
        ...original.seo,
        title: `${original.seo.title} (Copy)`,
        canonicalUrl: original.seo.canonicalUrl
          ? `${original.seo.canonicalUrl}-copy`
          : undefined,
      },
      isActive: false, // Duplicated pages start as inactive
    };

    const duplicated = new this.aboutUsModel(duplicatedData);
    return duplicated.save();
  }
}
