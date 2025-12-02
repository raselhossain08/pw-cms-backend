/**
 * Alternative Seed Script - Direct MongoDB
 * Use this if TypeScript compilation issues occur
 */

import mongoose from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/personal-wings';

const categories = [
  {
    name: 'Flight Training',
    slug: 'flight-training',
    description:
      'Comprehensive flight training programs for aspiring pilots, from private pilot to commercial certifications.',
    image:
      'https://personalwings.com/wp-content/uploads/2024/05/Taxiway-Delta-Transition-San-Diego-International-Airport-Overflight-canceled-400x250.webp',
    icon: '✈️',
    isActive: true,
  },
  {
    name: 'High Performance Aircraft',
    slug: 'high-performance-aircraft',
    description:
      'Advanced training for high-performance single and multi-engine aircraft operations.',
    image:
      'https://personalwings.com/wp-content/uploads/2023/04/Pickett-C206-400x250.webp',
    icon: '🚁',
    isActive: true,
  },
  {
    name: 'Turboprop Training',
    slug: 'turboprop-training',
    description:
      'Specialized training for turboprop aircraft operations and systems.',
    image:
      'https://personalwings.com/wp-content/uploads/2022/12/coast-flying-smitten-with-flight-feat-img-400x250.webp',
    icon: '🛩️',
    isActive: true,
  },
  {
    name: 'Light Jet Aircraft',
    slug: 'light-jet-aircraft',
    description:
      'Professional training for light jet operations and type ratings.',
    image:
      'https://personalwings.com/wp-content/uploads/2023/12/A320-Simulator-ATPJETS-400x250.webp',
    icon: '🛫',
    isActive: true,
  },
  {
    name: 'Aircraft Brokerage',
    slug: 'aircraft-brokerage',
    description:
      'Learn the business of aircraft sales, acquisitions, and brokerage services.',
    image:
      'https://personalwings.com/wp-content/uploads/2022/12/How-to-Become-a-Professional-Pilot-Female-Captain-400x250.jpeg',
    icon: '💼',
    isActive: true,
  },
  {
    name: 'Instrument Rating',
    slug: 'instrument-rating',
    description:
      'Instrument flight rules (IFR) training for all-weather flying capabilities.',
    icon: '🧭',
    isActive: true,
  },
  {
    name: 'Multi-Engine Rating',
    slug: 'multi-engine-rating',
    description:
      'Training for multi-engine aircraft operations and certification.',
    icon: '✈️',
    isActive: true,
  },
  {
    name: 'Commercial Pilot',
    slug: 'commercial-pilot',
    description: 'Professional pilot training for commercial aviation careers.',
    icon: '👨‍✈️',
    isActive: true,
  },
  {
    name: 'Flight Instructor',
    slug: 'flight-instructor',
    description:
      'Certified Flight Instructor (CFI) training programs and mentorship.',
    icon: '👩‍🏫',
    isActive: true,
  },
  {
    name: 'Airline Transport Pilot',
    slug: 'airline-transport-pilot',
    description:
      'ATP certification training for airline and corporate aviation careers.',
    icon: '🌍',
    isActive: true,
  },
];

async function seedCategories() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const CategoryModel = mongoose.model(
      'CourseCategory',
      new mongoose.Schema({
        name: { type: String, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        description: String,
        image: String,
        icon: String,
        isActive: { type: Boolean, default: true },
      }),
      'coursecategories',
    );

    console.log('Starting category seeding...\n');

    for (const category of categories) {
      try {
        const exists = await CategoryModel.findOne({
          $or: [{ name: category.name }, { slug: category.slug }],
        });

        if (exists) {
          console.log(`⚠ Skipped: ${category.name} (already exists)`);
        } else {
          await CategoryModel.create(category);
          console.log(`✓ Created: ${category.name} (${category.slug})`);
        }
      } catch (error: any) {
        if (error.code === 11000) {
          console.log(`⚠ Skipped: ${category.name} (duplicate key)`);
        } else {
          console.log(`✗ Error with ${category.name}:`, error.message);
        }
      }
    }

    console.log('\n✅ Category seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
