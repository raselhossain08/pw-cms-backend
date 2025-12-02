import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CourseCategoriesService } from '../course-categories/course-categories.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categoriesService = app.get(CourseCategoriesService);

  const categories = [
    {
      name: 'Flight Training',
      description:
        'Comprehensive flight training programs for aspiring pilots, from private pilot to commercial certifications.',
      image:
        'https://personalwings.com/wp-content/uploads/2024/05/Taxiway-Delta-Transition-San-Diego-International-Airport-Overflight-canceled-400x250.webp',
      icon: '✈️',
    },
    {
      name: 'High Performance Aircraft',
      description:
        'Advanced training for high-performance single and multi-engine aircraft operations.',
      image:
        'https://personalwings.com/wp-content/uploads/2023/04/Pickett-C206-400x250.webp',
      icon: '🚁',
    },
    {
      name: 'Turboprop Training',
      description:
        'Specialized training for turboprop aircraft operations and systems.',
      image:
        'https://personalwings.com/wp-content/uploads/2022/12/coast-flying-smitten-with-flight-feat-img-400x250.webp',
      icon: '🛩️',
    },
    {
      name: 'Light Jet Aircraft',
      description:
        'Professional training for light jet operations and type ratings.',
      image:
        'https://personalwings.com/wp-content/uploads/2023/12/A320-Simulator-ATPJETS-400x250.webp',
      icon: '🛫',
    },
    {
      name: 'Aircraft Brokerage',
      description:
        'Learn the business of aircraft sales, acquisitions, and brokerage services.',
      image:
        'https://personalwings.com/wp-content/uploads/2022/12/How-to-Become-a-Professional-Pilot-Female-Captain-400x250.jpeg',
      icon: '💼',
    },
    {
      name: 'Instrument Rating',
      description:
        'Instrument flight rules (IFR) training for all-weather flying capabilities.',
      icon: '🧭',
    },
    {
      name: 'Multi-Engine Rating',
      description:
        'Training for multi-engine aircraft operations and certification.',
      icon: '✈️',
    },
    {
      name: 'Commercial Pilot',
      description:
        'Professional pilot training for commercial aviation careers.',
      icon: '👨‍✈️',
    },
    {
      name: 'Flight Instructor',
      description:
        'Certified Flight Instructor (CFI) training programs and mentorship.',
      icon: '👩‍🏫',
    },
    {
      name: 'Airline Transport Pilot',
      description:
        'ATP certification training for airline and corporate aviation careers.',
      icon: '🌍',
    },
  ];

  console.log('Starting category seeding...\n');

  for (const category of categories) {
    try {
      const result = await categoriesService.add(category);
      console.log(`✓ Created: ${result.name} (${result.slug})`);
    } catch (error) {
      console.log(`⚠ Skipped: ${category.name} (already exists or error)`);
    }
  }

  console.log('\n✅ Category seeding completed!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error seeding categories:', err);
  process.exit(1);
});
