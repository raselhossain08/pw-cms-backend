import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AboutSection } from '../schemas/about-section.schema';

@Injectable()
export class AboutSectionSeeder {
  constructor(
    @InjectModel(AboutSection.name)
    private aboutSectionModel: Model<AboutSection>,
  ) {}

  async seed() {
    const count = await this.aboutSectionModel.countDocuments();

    if (count > 0) {
      console.log('About Section already exists, skipping seed.');
      return;
    }

    const aboutSectionData = {
      id: 'about',
      title: 'Passionate About Flight',
      subtitle: 'Meet Rich Pickett — Pilot, Instructor, and Aviation Innovator',
      description:
        "From my very first exploratory flight, aviation captured my heart. Over four decades later, my passion for flight continues to grow stronger every day. I've been privileged to fly privately and professionally across countless skies — yet each takeoff still feels like the first. Through my work as a high-performance flight instructor, aviation writer, and aircraft part designer, I've dedicated my life to helping pilots master their craft and fly with confidence.",
      image: '/img/about/1.jpg',
      highlights: [
        {
          icon: '🎓',
          label: 'Certified Flight Instructor',
          text: 'Teaching high-performance and advanced flight operations for over 40 years.',
        },
        {
          icon: '🛩️',
          label: 'Aviation Innovator',
          text: 'Designing and producing precision aircraft parts for improved safety and efficiency.',
        },
        {
          icon: '❤️',
          label: 'Community Volunteer',
          text: 'Flying charitable missions and mentoring the next generation of aviators.',
        },
      ],
      cta: {
        label: 'Explore My Courses',
        link: '/courses',
      },
      stats: [
        {
          value: 5000,
          suffix: '+',
          label: 'Hours Flown',
        },
        {
          value: 1000,
          suffix: '+',
          label: 'Students Trained',
        },
        {
          value: 50,
          suffix: '+',
          label: 'Aircraft Types',
        },
      ],
      seo: {
        title:
          'About Rich Pickett - Certified Flight Instructor & Aviation Innovator',
        description:
          'Meet Rich Pickett, a passionate certified flight instructor with over 5000+ hours flown and 1000+ students trained. Discover his journey in aviation education and community service.',
        keywords:
          'Rich Pickett, flight instructor, aviation innovator, pilot training, certified instructor, aviation education',
        ogTitle: 'About Rich Pickett - Your Guide to the Skies',
        ogDescription:
          "Learn about Rich Pickett's journey as a certified flight instructor, aviation innovator, and community volunteer with thousands of hours of flight experience.",
      },
      isActive: true,
    };

    await this.aboutSectionModel.create(aboutSectionData);
    console.log('About Section seeded successfully!');
  }
}
