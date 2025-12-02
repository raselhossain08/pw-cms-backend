import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import {
  Product,
  ProductType,
  ProductStatus,
  AircraftCategory,
} from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { getModelToken } from '@nestjs/mongoose';

async function seedProducts() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel: Model<Product> = app.get(getModelToken(Product.name));
  const userModel: Model<User> = app.get(getModelToken(User.name));

  try {
    console.log('🌱 Starting product seeding...');

    // Find the instructor/seller user
    let seller = await userModel.findOne({
      email: 'instructor@personalwings.com',
    });

    if (!seller) {
      console.log('⚠️ No instructor found. Creating one...');
      const bcrypt = require('bcryptjs');
      seller = await userModel.create({
        email: 'instructor@personalwings.com',
        firstName: 'Captain',
        lastName: 'Rich Pickett',
        password: await bcrypt.hash('password123', 10),
        role: 'instructor',
        slug: 'captain-rich-pickett',
        phone: '+1 (619) 555-0123',
        country: 'United States',
        state: 'California',
        city: 'San Diego',
        avatar: 'https://github.com/shadcn.png',
        bio: 'Chief Flight Instructor with over 25 years of aviation experience and 5,000+ flight hours.',
        certifications: [
          'ATP',
          'CFI',
          'CFII',
          'MEI',
          'Type Rated: Citation 525',
          'Advanced Ground Instructor',
        ],
        flightHours: 5000,
      });
      console.log('✅ Instructor created');
    }

    const products = [
      // Aircraft - Single Engine
      {
        title: 'Cirrus SR22 G6',
        slug: 'cirrus-sr22-g6-2020',
        description:
          'Impeccably maintained 2020 Cirrus SR22 G6 with Perspective+ avionics. This aircraft represents the pinnacle of single-engine piston performance and safety. Features include advanced Garmin avionics, air conditioning, and comprehensive safety systems including CAPS parachute.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 750000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.SINGLE_ENGINE,
        manufacturer: 'Cirrus',
        productModel: 'SR22 G6',
        year: 2020,
        totalTime: 450,
        timeSinceOverhaul: 450,
        engineModel: 'Continental IO-550-N',
        engineHorsepower: 310,
        avionics: 'Garmin Perspective+ with G1000 NXi',
        features: [
          'CAPS Parachute System',
          'Air Conditioning',
          'Known Ice Protection (FIKI)',
          'Premium Leather Interior',
          'Enhanced Vision System (EVS)',
          'Flight Stream 510',
          'ADS-B In/Out',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Wing-Top-View-Citation-CJ.webp',
          'https://personalwings.com/wp-content/uploads/2019/12/Eclipse1.mov',
        ],
        location: 'KSNA',
        locationDescription: 'John Wayne Airport, Orange County, CA',
        isFeatured: true,
        rating: 5,
        reviewCount: 12,
        viewCount: 245,
        seller: seller._id,
        specifications: {
          seats: 5,
          cruiseSpeed: 213,
          range: 1207,
          fuelCapacity: 92,
          maxTakeoffWeight: 3600,
          usefulLoad: 1348,
        },
        maintenance: {
          lastAnnual: new Date('2024-09-15'),
          nextAnnual: new Date('2025-09-15'),
          last100Hour: new Date('2024-11-01'),
          next100Hour: new Date('2025-02-01'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: [
          'single_engine',
          'ifr_capable',
          'glass_cockpit',
          'high_performance',
        ],
        quantity: 1,
      },
      {
        title: 'Cessna 182 Skylane',
        slug: 'cessna-182-skylane-2018',
        description:
          'Pristine 2018 Cessna 182T Skylane with G1000 avionics suite. Perfect for cross-country travel with outstanding payload capacity and short-field performance. Well-maintained by authorized Cessna service centers with complete logbooks.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 425000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.SINGLE_ENGINE,
        manufacturer: 'Cessna',
        productModel: '182T Skylane',
        year: 2018,
        totalTime: 780,
        timeSinceOverhaul: 780,
        engineModel: 'Lycoming IO-540-AB1A5',
        engineHorsepower: 230,
        avionics: 'Garmin G1000 NXi',
        features: [
          'G1000 NXi Avionics',
          'GFC 700 Autopilot',
          'ADS-B In/Out',
          'Leather Interior',
          'LED Landing Lights',
          'Rosen Sun Visors',
          'USB Charging Ports',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Strakes-Citation-Mustang.webp',
        ],
        location: 'KAPA',
        locationDescription: 'Centennial Airport, Denver, CO',
        isFeatured: true,
        rating: 5,
        reviewCount: 8,
        viewCount: 189,
        seller: seller._id,
        specifications: {
          seats: 4,
          cruiseSpeed: 145,
          range: 915,
          fuelCapacity: 88,
          maxTakeoffWeight: 3110,
          usefulLoad: 1065,
        },
        maintenance: {
          lastAnnual: new Date('2024-08-20'),
          nextAnnual: new Date('2025-08-20'),
          last100Hour: new Date('2024-10-15'),
          next100Hour: new Date('2025-01-15'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: ['single_engine', 'ifr_capable', 'training', 'cross_country'],
        quantity: 1,
      },
      // Aircraft - Multi Engine
      {
        title: 'Beechcraft Baron G58',
        slug: 'beechcraft-baron-g58-2019',
        description:
          'Luxurious 2019 Beechcraft Baron G58 with low hours and impeccable maintenance history. Twin Continental IO-550 engines provide excellent performance and redundancy. Perfect for business travel or advanced multi-engine training.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 1200000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.MULTI_ENGINE,
        manufacturer: 'Beechcraft',
        productModel: 'Baron G58',
        year: 2019,
        totalTime: 520,
        timeSinceOverhaul: 520,
        engineModel: 'Continental IO-550-C (2)',
        engineHorsepower: 300,
        avionics: 'Garmin G1000 NXi',
        features: [
          'G1000 NXi with Synthetic Vision',
          'GFC 700 Autopilot',
          'Air Conditioning',
          'De-Ice Boots',
          'Club Seating',
          'Oxygen System',
          'ADS-B In/Out',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Votex-Generators-Citation-Mustang.webp',
        ],
        location: 'KTEB',
        locationDescription: 'Teterboro Airport, NJ',
        isFeatured: true,
        rating: 5,
        reviewCount: 15,
        viewCount: 312,
        seller: seller._id,
        specifications: {
          seats: 6,
          cruiseSpeed: 202,
          range: 1480,
          fuelCapacity: 194,
          maxTakeoffWeight: 5500,
          usefulLoad: 1708,
        },
        maintenance: {
          lastAnnual: new Date('2024-07-10'),
          nextAnnual: new Date('2025-07-10'),
          last100Hour: new Date('2024-09-25'),
          next100Hour: new Date('2024-12-25'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: ['multi_engine', 'ifr_capable', 'pressurized', 'business'],
        quantity: 1,
      },
      // Aircraft - Turboprop
      {
        title: 'Pilatus PC-12 NG',
        slug: 'pilatus-pc12-ng-2018',
        description:
          'Executive 2018 Pilatus PC-12 NG with Pratt & Whitney PT6A-67P engine. The ultimate single-engine turboprop combining jet-like speed with exceptional runway performance. Fully equipped for corporate travel with executive interior.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 4500000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.TURBOPROP,
        manufacturer: 'Pilatus',
        productModel: 'PC-12 NG',
        year: 2018,
        totalTime: 1250,
        timeSinceOverhaul: 1250,
        engineModel: 'Pratt & Whitney PT6A-67P',
        engineHorsepower: 1200,
        avionics: 'Honeywell Apex',
        features: [
          'Honeywell Apex Avionics',
          'Executive Interior Configuration',
          'Known Ice Protection (FIKI)',
          'Oxygen System',
          'Air Conditioning',
          'APU',
          'Forward Cargo Door',
          'Aft Baggage Door',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Stall-Strip-Citation-Jet.webp',
        ],
        location: 'KSDL',
        locationDescription: 'Scottsdale Airport, AZ',
        isFeatured: true,
        rating: 5,
        reviewCount: 6,
        viewCount: 445,
        seller: seller._id,
        specifications: {
          seats: 9,
          cruiseSpeed: 285,
          range: 1803,
          fuelCapacity: 402,
          maxTakeoffWeight: 10450,
          usefulLoad: 4299,
        },
        maintenance: {
          lastAnnual: new Date('2024-06-01'),
          nextAnnual: new Date('2025-06-01'),
          last100Hour: new Date('2024-10-01'),
          next100Hour: new Date('2025-01-01'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: ['turboprop', 'pressurized', 'executive', 'cargo_capable'],
        quantity: 1,
      },
      {
        title: 'King Air C90GTx',
        slug: 'king-air-c90gtx-2019',
        description:
          'Exceptional 2019 King Air C90GTx with Rockwell Collins Pro Line 21 avionics. Twin turboprop reliability with pressurized comfort. Perfect for business or charter operations with proven dispatch reliability.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 2800000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.TURBOPROP,
        manufacturer: 'Beechcraft',
        productModel: 'King Air C90GTx',
        year: 2019,
        totalTime: 950,
        timeSinceOverhaul: 950,
        engineModel: 'Pratt & Whitney PT6A-135A (2)',
        engineHorsepower: 750,
        avionics: 'Rockwell Collins Pro Line 21',
        features: [
          'Pro Line 21 Avionics',
          'Synthetic Vision',
          'Air Conditioning',
          'Known Ice Protection',
          'Club Seating',
          'Refreshment Center',
          'ADS-B In/Out',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Thrust-Attenuator-3.webp',
        ],
        location: 'KPDK',
        locationDescription: 'DeKalb-Peachtree Airport, Atlanta, GA',
        isFeatured: false,
        rating: 5,
        reviewCount: 10,
        viewCount: 278,
        seller: seller._id,
        specifications: {
          seats: 7,
          cruiseSpeed: 271,
          range: 1185,
          fuelCapacity: 384,
          maxTakeoffWeight: 10100,
          usefulLoad: 3805,
        },
        maintenance: {
          lastAnnual: new Date('2024-05-15'),
          nextAnnual: new Date('2025-05-15'),
          last100Hour: new Date('2024-09-01'),
          next100Hour: new Date('2024-12-01'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: ['turboprop', 'pressurized', 'twin_engine', 'business'],
        quantity: 1,
      },
      // Aircraft - Light Jet
      {
        title: 'Embraer Phenom 100E',
        slug: 'embraer-phenom-100e-2021',
        description:
          'Stunning 2021 Embraer Phenom 100E very light jet with Prodigy Touch avionics. Low flight hours and meticulously maintained. Single-pilot capable with excellent performance and operating economics.',
        type: ProductType.AIRCRAFT,
        status: ProductStatus.PUBLISHED,
        price: 3200000,
        currency: 'USD',
        aircraftCategory: AircraftCategory.JET,
        manufacturer: 'Embraer',
        productModel: 'Phenom 100E',
        year: 2021,
        totalTime: 380,
        timeSinceOverhaul: 380,
        engineModel: 'Pratt & Whitney PW617F-E (2)',
        engineHorsepower: 1730,
        avionics: 'Garmin Prodigy Touch G3000',
        features: [
          'Prodigy Touch Avionics',
          'Synthetic Vision Technology',
          'Executive Interior',
          'Lavatory',
          'Refreshment Center',
          'ADS-B In/Out',
          'WiFi Capable',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2019/12/Eclipse1.mov',
        ],
        location: 'KVNY',
        locationDescription: 'Van Nuys Airport, Los Angeles, CA',
        isFeatured: true,
        rating: 5,
        reviewCount: 4,
        viewCount: 523,
        seller: seller._id,
        specifications: {
          seats: 6,
          cruiseSpeed: 406,
          range: 1178,
          fuelCapacity: 3058,
          maxTakeoffWeight: 10472,
          usefulLoad: 3241,
        },
        maintenance: {
          lastAnnual: new Date('2024-04-20'),
          nextAnnual: new Date('2025-04-20'),
          last100Hour: new Date('2024-08-15'),
          next100Hour: new Date('2024-11-15'),
          damageHistory: false,
          damageDescription: '',
        },
        tags: ['jet', 'pressurized', 'single_pilot', 'very_light_jet'],
        quantity: 1,
      },
      // Equipment
      {
        title: 'Garmin G1000 NXi Upgrade Kit',
        slug: 'garmin-g1000-nxi-upgrade-kit',
        description:
          'Complete Garmin G1000 NXi upgrade package for eligible aircraft. Transform your G1000 to NXi with faster processors, wireless connectivity, and enhanced features. Includes all necessary hardware and software.',
        type: ProductType.EQUIPMENT,
        status: ProductStatus.PUBLISHED,
        price: 28500,
        currency: 'USD',
        manufacturer: 'Garmin',
        productModel: 'G1000 NXi Upgrade',
        features: [
          'Faster Processors',
          'Wireless Database Updates',
          'Flight Stream 510 Integration',
          'Enhanced Display Resolution',
          'Visual Approaches',
          'SurfaceWatch',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Wing-Top-View-Citation-CJ.webp',
        ],
        location: 'KSDL',
        locationDescription: 'Scottsdale, AZ',
        isFeatured: true,
        rating: 5,
        reviewCount: 22,
        viewCount: 567,
        seller: seller._id,
        tags: ['avionics', 'upgrade', 'garmin', 'glass_cockpit'],
        quantity: 5,
      },
      {
        title: 'Bose A20 Aviation Headset',
        slug: 'bose-a20-aviation-headset',
        description:
          'Industry-leading Bose A20 Aviation Headset with Bluetooth connectivity. Active noise cancellation provides unmatched comfort on long flights. Dual plug configuration with auxiliary audio input.',
        type: ProductType.EQUIPMENT,
        status: ProductStatus.PUBLISHED,
        price: 1095,
        currency: 'USD',
        manufacturer: 'Bose',
        productModel: 'A20',
        features: [
          'Active Noise Cancellation',
          'Bluetooth Connectivity',
          'Dual Plug Configuration',
          'Auxiliary Audio Input',
          'Priority Switching',
          '5-Year Warranty',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Strakes-Citation-Mustang.webp',
        ],
        location: 'Multiple Locations',
        locationDescription: 'Available Nationwide',
        isFeatured: false,
        rating: 5,
        reviewCount: 89,
        viewCount: 1245,
        seller: seller._id,
        tags: ['headset', 'equipment', 'pilot_gear'],
        quantity: 15,
      },
      // Simulator
      {
        title: 'Redbird FMX Full Motion Simulator',
        slug: 'redbird-fmx-full-motion-simulator',
        description:
          'FAA-approved Redbird FMX full motion flight simulator. Perfect for flight schools or individual training. Includes comprehensive IFR training scenarios and various aircraft configurations.',
        type: ProductType.SIMULATOR,
        status: ProductStatus.PUBLISHED,
        price: 89500,
        currency: 'USD',
        manufacturer: 'Redbird',
        productModel: 'FMX',
        features: [
          'FAA-Approved AATD',
          'Full Motion Platform',
          'Wrap-Around Visuals',
          'Multiple Aircraft Profiles',
          'IFR Training Scenarios',
          'Instructor Station',
          'Weather Simulation',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Votex-Generators-Citation-Mustang.webp',
        ],
        location: 'KSDL',
        locationDescription: 'Scottsdale, AZ',
        isFeatured: true,
        rating: 5,
        reviewCount: 12,
        viewCount: 432,
        seller: seller._id,
        tags: ['simulator', 'training', 'faa_approved'],
        quantity: 1,
      },
      // Services
      {
        title: 'Annual Inspection Package',
        slug: 'annual-inspection-package',
        description:
          'Comprehensive annual inspection service for single-engine piston aircraft. Our A&P/IA mechanics perform thorough inspections following manufacturer specifications. Includes detailed squawk list and recommendations.',
        type: ProductType.SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 2500,
        currency: 'USD',
        features: [
          'Complete Airframe Inspection',
          'Engine Inspection',
          'Avionics Check',
          'Detailed Squawk List',
          'Logbook Entries',
          'Airworthiness Certificate',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Stall-Strip-Citation-Jet.webp',
        ],
        location: 'KSDL',
        locationDescription: 'Scottsdale, AZ',
        isFeatured: false,
        rating: 5,
        reviewCount: 45,
        viewCount: 678,
        seller: seller._id,
        tags: ['service', 'maintenance', 'inspection'],
        quantity: 100,
      },
      {
        title: 'Pre-Purchase Inspection',
        slug: 'pre-purchase-inspection',
        description:
          'Thorough pre-purchase inspection service for aircraft buyers. Independent evaluation by experienced A&P mechanics. Includes borescope inspection, compression check, and detailed report with high-resolution photos.',
        type: ProductType.SERVICE,
        status: ProductStatus.PUBLISHED,
        price: 1800,
        currency: 'USD',
        features: [
          'Logbook Review',
          'Borescope Inspection',
          'Compression Test',
          'Avionics Functionality Check',
          'Test Flight',
          'Detailed Photo Report',
        ],
        images: [
          'https://personalwings.com/wp-content/uploads/2025/03/3.2-Thrust-Attenuator-3.webp',
        ],
        location: 'Nationwide',
        locationDescription: 'Travel to Aircraft Location',
        isFeatured: false,
        rating: 5,
        reviewCount: 67,
        viewCount: 890,
        seller: seller._id,
        tags: ['service', 'inspection', 'pre_purchase'],
        quantity: 50,
      },
    ];

    // Insert or update products
    for (const productData of products) {
      const existing = await productModel.findOne({ slug: productData.slug });

      if (existing) {
        await productModel.updateOne(
          { slug: productData.slug },
          { $set: productData },
        );
        console.log(`✅ Updated product: ${productData.title}`);
      } else {
        await productModel.create(productData);
        console.log(`✅ Created product: ${productData.title}`);
      }
    }

    console.log(`\n🎉 Product seeding completed successfully!`);
    console.log(`📊 Total products: ${products.length}`);
    console.log(
      `   - Aircraft: ${products.filter((p) => p.type === ProductType.AIRCRAFT).length}`,
    );
    console.log(
      `   - Equipment: ${products.filter((p) => p.type === ProductType.EQUIPMENT).length}`,
    );
    console.log(
      `   - Simulators: ${products.filter((p) => p.type === ProductType.SIMULATOR).length}`,
    );
    console.log(
      `   - Services: ${products.filter((p) => p.type === ProductType.SERVICE).length}`,
    );
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedProducts()
  .then(() => {
    console.log('✨ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
