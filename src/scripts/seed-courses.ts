import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { CoursesService } from '../courses/courses.service';
import { UsersService } from '../users/users.service';
import {
  CourseLevel,
  CourseType,
  CourseStatus,
} from '../courses/entities/course.entity';
import { UserRole } from '../users/entities/user.entity';

async function seedCourses() {
  const logger = new Logger('CoursesSeed');
  const app = await NestFactory.create(AppModule);

  try {
    const coursesService = app.get(CoursesService);
    const usersService = app.get(UsersService);

    // Find or create instructor
    const instructor = await usersService.findByEmail(
      'instructor@personalwings.com',
    );

    if (!instructor) {
      logger.warn(
        '⚠️  Instructor not found. Please run seed-database.ts first.',
      );
      await app.close();
      return;
    }

    logger.log(`✅ Found instructor: ${instructor.email}`);

    // Course seed data
    const coursesData = [
      {
        title: 'High Performance Aircraft Transition',
        description:
          'Master high performance aircraft operations including complex systems, advanced aerodynamics, and professional flight techniques. This comprehensive course prepares pilots for the unique challenges of flying high-performance aircraft with advanced avionics and powerful engines.',
        slug: 'high-performance-aircraft-transition',
        excerpt:
          'Master high performance aircraft operations including complex systems and advanced aerodynamics.',
        level: CourseLevel.ADVANCED,
        type: CourseType.COMBINED,
        status: CourseStatus.PUBLISHED,
        price: 2500,
        originalPrice: 3200,
        duration: 15,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2023/04/Pickett-C206-400x250.webp',
        prerequisites: [
          'Private Pilot Certificate',
          'Minimum 100 hours flight time',
          'Current medical certificate',
          'Basic understanding of complex aircraft systems',
        ],
        learningObjectives: [
          'Master high-performance aircraft handling and operations',
          'Understand complex aircraft systems and avionics',
          'Execute advanced flight maneuvers safely',
          'Navigate using modern avionics and GPS systems',
          'Apply advanced aerodynamic principles',
          'Manage engine and power systems effectively',
          'Handle emergency procedures in high-performance aircraft',
        ],
        outcomes: [
          'High Performance Aircraft Endorsement',
          'Complex Aircraft Endorsement',
          'Advanced Systems Certification',
          'Professional pilot skills development',
        ],
        categories: ['Flight Training', 'Advanced Aviation'],
        tags: [
          'high-performance',
          'complex-aircraft',
          'advanced-training',
          'flight-operations',
        ],
        language: 'English',
        isFeatured: true,
        rating: 4.9,
        enrollmentCount: 42,
        modules: [
          {
            title: 'Introduction to High Performance Aircraft',
            description:
              'Overview of high-performance aircraft characteristics and operations',
            order: 1,
            duration: 120,
            lessons: [
              {
                title: 'Course Overview and Objectives',
                type: 'video',
                duration: '15 min',
                preview: true,
                locked: false,
              },
              {
                title: 'High-Performance Aircraft Definition',
                type: 'video',
                duration: '20 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Aircraft Systems Overview',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Safety Considerations',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Module 1 Quiz',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Advanced Aerodynamics',
            description:
              'Understanding aerodynamic principles for high-performance flight',
            order: 2,
            duration: 180,
            lessons: [
              {
                title: 'Lift and Drag at High Speeds',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Power Settings and Performance',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Weight and Balance Considerations',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Stall and Spin Characteristics',
                type: 'video',
                duration: '45 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Module 2 Assessment',
                type: 'quiz',
                duration: '35 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Engine and Power Management',
            description: 'Master engine operations and power settings',
            order: 3,
            duration: 150,
            lessons: [
              {
                title: 'Engine Operating Principles',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Fuel Management Systems',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Power Settings for Different Phases',
                type: 'reading',
                duration: '20 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Engine Monitoring and Troubleshooting',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Practical Exercise',
                type: 'assignment',
                duration: '25 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Flight Operations',
            description: 'Practical flight operations and procedures',
            order: 4,
            duration: 200,
            lessons: [
              {
                title: 'Pre-Flight Planning',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Takeoff and Climb Procedures',
                type: 'video',
                duration: '45 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Cruise Operations',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Approach and Landing',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Emergency Procedures',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Final Practical Exam',
                type: 'exam',
                duration: '20 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Turboprop Aircraft Training',
        description:
          'Complete turboprop training program covering systems, operations, and advanced flight procedures for turbine-powered aircraft. Learn to operate sophisticated turboprop aircraft with confidence and professionalism.',
        slug: 'turboprop-aircraft-training',
        excerpt:
          'Complete turboprop training program covering systems and advanced flight procedures.',
        level: CourseLevel.ADVANCED,
        type: CourseType.COMBINED,
        status: CourseStatus.PUBLISHED,
        price: 3200,
        originalPrice: 4000,
        duration: 20,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2022/12/coast-flying-smitten-with-flight-feat-img-400x250.webp',
        prerequisites: [
          'Commercial Pilot License',
          'Instrument Rating',
          'Minimum 250 hours flight time',
          'Multi-engine rating',
          'High-performance endorsement',
        ],
        learningObjectives: [
          'Understand turboprop engine systems and operations',
          'Master turbine aircraft flight procedures',
          'Execute precise turboprop operations',
          'Manage fuel systems and engine monitoring',
          'Handle turboprop-specific emergencies',
          'Navigate complex airspace in turbine aircraft',
          'Apply crew resource management principles',
        ],
        outcomes: [
          'Turboprop Type Rating',
          'Advanced Turbine Certification',
          'Professional pilot qualification',
          'Career advancement opportunities',
        ],
        categories: ['Flight Training', 'Type Rating', 'Professional Aviation'],
        tags: [
          'turboprop',
          'turbine-training',
          'type-rating',
          'professional-pilot',
        ],
        language: 'English',
        isFeatured: true,
        rating: 4.8,
        enrollmentCount: 58,
        modules: [
          {
            title: 'Turboprop Systems Overview',
            description:
              'Introduction to turbine engines and turboprop systems',
            order: 1,
            duration: 180,
            lessons: [
              {
                title: 'Introduction to Turboprop Aircraft',
                type: 'video',
                duration: '20 min',
                preview: true,
                locked: false,
              },
              {
                title: 'Turbine Engine Principles',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Propeller Systems',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Fuel Systems',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Electrical and Hydraulic Systems',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Systems Quiz',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Engine Operations',
            description: 'Starting, operating, and monitoring turbine engines',
            order: 2,
            duration: 200,
            lessons: [
              {
                title: 'Engine Start Procedures',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Power Settings and Limitations',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Engine Monitoring',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Fuel Management',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Engine Shutdown Procedures',
                type: 'video',
                duration: '20 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Operations Assessment',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Flight Operations',
            description: 'Normal and abnormal flight procedures',
            order: 3,
            duration: 240,
            lessons: [
              {
                title: 'Pre-Flight and Taxi Procedures',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Takeoff and Climb',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Cruise Flight Operations',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Descent and Approach',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Landing and Ground Operations',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Flight Operations Exam',
                type: 'exam',
                duration: '40 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Emergency Procedures',
            description: 'Handling turboprop emergencies and system failures',
            order: 4,
            duration: 180,
            lessons: [
              {
                title: 'Engine Failure Procedures',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Fire Detection and Suppression',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Electrical System Failures',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Hydraulic System Failures',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Emergency Landing Procedures',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Emergency Procedures Final Exam',
                type: 'exam',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Light Jet Type Rating',
        description:
          'Professional light jet type rating program with simulator training and comprehensive ground school instruction. Prepare for a career in corporate or commercial jet operations.',
        slug: 'light-jet-type-rating',
        excerpt:
          'Professional light jet type rating with simulator training and ground school.',
        level: CourseLevel.EXPERT,
        type: CourseType.COMBINED,
        status: CourseStatus.PUBLISHED,
        price: 4500,
        originalPrice: 5500,
        duration: 25,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2023/12/A320-Simulator-ATPJETS-400x250.webp',
        prerequisites: [
          'ATP Certificate or Commercial License with Instrument Rating',
          'Minimum 500 hours total flight time',
          'Multi-engine rating',
          'First Class Medical Certificate',
          'Turbine experience recommended',
        ],
        learningObjectives: [
          'Master light jet systems and operations',
          'Execute precision flying in jet aircraft',
          'Understand advanced avionics and automation',
          'Apply crew resource management in jet operations',
          'Handle jet-specific emergencies',
          'Navigate high-altitude airspace',
          'Perform precision instrument approaches',
          'Manage modern flight management systems',
        ],
        outcomes: [
          'FAA Type Rating Certificate',
          'Light Jet Qualification',
          'Professional jet pilot certification',
          'Career advancement in corporate aviation',
        ],
        categories: ['Type Rating', 'Jet Training', 'Professional Aviation'],
        tags: [
          'jet-training',
          'type-rating',
          'corporate-aviation',
          'simulator-training',
        ],
        language: 'English',
        isFeatured: true,
        rating: 5.0,
        enrollmentCount: 34,
        modules: [
          {
            title: 'Light Jet Systems',
            description: 'Comprehensive overview of jet systems and operations',
            order: 1,
            duration: 240,
            lessons: [
              {
                title: 'Jet Aircraft Overview',
                type: 'video',
                duration: '25 min',
                preview: true,
                locked: false,
              },
              {
                title: 'Turbofan Engine Systems',
                type: 'video',
                duration: '45 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Pressurization Systems',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Environmental Control',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Anti-Ice and De-Ice Systems',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Advanced Avionics',
                type: 'video',
                duration: '50 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Systems Knowledge Test',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Flight Management Systems',
            description: 'Master FMS operation and navigation',
            order: 2,
            duration: 200,
            lessons: [
              {
                title: 'FMS Introduction and Architecture',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Flight Planning with FMS',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Navigation Database',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Autopilot Integration',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Performance Calculations',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'FMS Proficiency Test',
                type: 'exam',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Simulator Training',
            description: 'Hands-on simulator sessions for practical experience',
            order: 3,
            duration: 400,
            lessons: [
              {
                title: 'Simulator Orientation',
                type: 'video',
                duration: '20 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Normal Procedures Practice',
                type: 'simulator',
                duration: '90 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Abnormal Procedures',
                type: 'simulator',
                duration: '90 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Emergency Procedures',
                type: 'simulator',
                duration: '90 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Instrument Approaches',
                type: 'simulator',
                duration: '60 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Simulator Check Ride',
                type: 'exam',
                duration: '50 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Type Rating Check Ride Prep',
            description: 'Preparation for FAA type rating examination',
            order: 4,
            duration: 160,
            lessons: [
              {
                title: 'Oral Exam Preparation',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Systems Knowledge Review',
                type: 'reading',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Flight Maneuvers Review',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Check Ride Standards',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Mock Check Ride',
                type: 'simulator',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Instrument Rating Course',
        description:
          'Comprehensive instrument rating training covering IFR procedures, instrument approaches, navigation systems, and weather theory. Become proficient in flying solely by reference to instruments.',
        slug: 'instrument-rating-course',
        excerpt:
          'Master IFR flying with comprehensive instrument rating training.',
        level: CourseLevel.INTERMEDIATE,
        type: CourseType.COMBINED,
        status: CourseStatus.PUBLISHED,
        price: 2800,
        originalPrice: 3500,
        duration: 18,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2023/04/Pickett-C206-400x250.webp',
        prerequisites: [
          'Private Pilot Certificate',
          'Minimum 50 hours cross-country PIC time',
          'Valid medical certificate',
          'English language proficiency',
        ],
        learningObjectives: [
          'Master instrument flight procedures',
          'Execute precision and non-precision approaches',
          'Navigate using IFR systems',
          'Interpret weather charts and forecasts',
          'Communicate effectively with ATC',
          'Plan IFR flights accurately',
          'Handle instrument emergencies',
        ],
        outcomes: [
          'FAA Instrument Rating',
          'IFR flying proficiency',
          'Enhanced safety capabilities',
          'Career advancement qualification',
        ],
        categories: ['Flight Training', 'Instrument Training'],
        tags: [
          'instrument-rating',
          'ifr',
          'instrument-flight',
          'aviation-training',
        ],
        language: 'English',
        isFeatured: false,
        rating: 4.7,
        enrollmentCount: 76,
        modules: [
          {
            title: 'IFR Regulations and Procedures',
            description:
              'Understanding instrument flight rules and regulations',
            order: 1,
            duration: 150,
            lessons: [
              {
                title: 'Introduction to IFR Flying',
                type: 'video',
                duration: '20 min',
                preview: true,
                locked: false,
              },
              {
                title: 'FAA Instrument Regulations',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: false,
              },
              {
                title: 'IFR Flight Planning',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'ATC Communications',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'IFR Regulations Quiz',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Instrument Navigation',
            description: 'VOR, GPS, and modern navigation systems',
            order: 2,
            duration: 180,
            lessons: [
              {
                title: 'VOR Navigation',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'GPS and RNAV',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Holding Procedures',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Enroute Charts',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Navigation Assessment',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Instrument Approaches',
            description: 'Mastering precision and non-precision approaches',
            order: 3,
            duration: 200,
            lessons: [
              {
                title: 'ILS Approaches',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'VOR and RNAV Approaches',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Circling Approaches',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Missed Approach Procedures',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Approach Charts',
                type: 'reading',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Approach Procedures Exam',
                type: 'exam',
                duration: '40 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Weather Theory for IFR',
            description:
              'Aviation weather and meteorology for instrument flying',
            order: 4,
            duration: 120,
            lessons: [
              {
                title: 'Aviation Weather Services',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Weather Charts and Reports',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Thunderstorms and Icing',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Weather Decision Making',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Multi-Engine Rating',
        description:
          'Gain your multi-engine rating and learn to safely operate twin-engine aircraft. Master engine-out procedures, systems management, and advanced flight operations.',
        slug: 'multi-engine-rating',
        excerpt:
          'Master twin-engine aircraft operations and emergency procedures.',
        level: CourseLevel.INTERMEDIATE,
        type: CourseType.PRACTICAL,
        status: CourseStatus.PUBLISHED,
        price: 2200,
        originalPrice: 2800,
        duration: 12,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2022/12/coast-flying-smitten-with-flight-feat-img-400x250.webp',
        prerequisites: [
          'Private Pilot Certificate',
          'Minimum 75 hours flight time',
          'Current medical certificate',
        ],
        learningObjectives: [
          'Master multi-engine aircraft systems',
          'Execute single-engine operations safely',
          'Perform Vmc demonstrations',
          'Handle engine failures and emergencies',
          'Understand complex aircraft systems',
          'Apply multi-engine aerodynamics',
          'Navigate and communicate effectively',
        ],
        outcomes: [
          'Multi-Engine Rating',
          'Twin-engine qualification',
          'Enhanced pilot capabilities',
          'Career progression opportunities',
        ],
        categories: ['Flight Training', 'Advanced Aviation'],
        tags: ['multi-engine', 'twin-engine', 'advanced-training'],
        language: 'English',
        isFeatured: false,
        rating: 4.6,
        enrollmentCount: 52,
        modules: [
          {
            title: 'Multi-Engine Aerodynamics',
            description: 'Understanding twin-engine flight characteristics',
            order: 1,
            duration: 120,
            lessons: [
              {
                title: 'Introduction to Multi-Engine Aircraft',
                type: 'video',
                duration: '20 min',
                preview: true,
                locked: false,
              },
              {
                title: 'Twin-Engine Aerodynamics',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Critical Engine and Vmc',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Performance Considerations',
                type: 'reading',
                duration: '20 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Aerodynamics Quiz',
                type: 'quiz',
                duration: '15 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Engine-Out Procedures',
            description: 'Handling single-engine emergencies',
            order: 2,
            duration: 150,
            lessons: [
              {
                title: 'Engine Failure Recognition',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Immediate Action Items',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Single-Engine Flight',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Engine-Out Landing',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Emergency Procedures Test',
                type: 'exam',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Systems Management',
            description: 'Managing complex multi-engine systems',
            order: 3,
            duration: 100,
            lessons: [
              {
                title: 'Fuel Systems',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Electrical Systems',
                type: 'video',
                duration: '20 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Hydraulic Systems',
                type: 'reading',
                duration: '15 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Systems Integration',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Systems Final Exam',
                type: 'exam',
                duration: '15 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
      {
        title: 'Commercial Pilot Training',
        description:
          'Complete commercial pilot training program preparing you for a professional aviation career. Learn advanced maneuvers, commercial operations, and professional standards.',
        slug: 'commercial-pilot-training',
        excerpt: 'Professional pilot training for commercial aviation careers.',
        level: CourseLevel.ADVANCED,
        type: CourseType.COMBINED,
        status: CourseStatus.PUBLISHED,
        price: 3500,
        originalPrice: 4200,
        duration: 22,
        thumbnail:
          'https://personalwings.com/wp-content/uploads/2023/04/Pickett-C206-400x250.webp',
        prerequisites: [
          'Private Pilot Certificate',
          'Instrument Rating',
          'Minimum 150 hours flight time',
          'Second Class Medical Certificate',
        ],
        learningObjectives: [
          'Master commercial flight maneuvers',
          'Understand commercial aviation regulations',
          'Execute professional flight operations',
          'Perform advanced ground reference maneuvers',
          'Apply aeronautical decision-making',
          'Demonstrate professional pilot standards',
          'Navigate complex airspace systems',
        ],
        outcomes: [
          'Commercial Pilot Certificate',
          'Professional pilot qualification',
          'Career readiness',
          'Advanced flying skills',
        ],
        categories: [
          'Flight Training',
          'Professional Aviation',
          'Career Development',
        ],
        tags: ['commercial-pilot', 'professional-training', 'career-aviation'],
        language: 'English',
        isFeatured: true,
        rating: 4.9,
        enrollmentCount: 89,
        modules: [
          {
            title: 'Commercial Flight Maneuvers',
            description:
              'Master chandelles, lazy eights, and other commercial maneuvers',
            order: 1,
            duration: 200,
            lessons: [
              {
                title: 'Commercial Pilot Overview',
                type: 'video',
                duration: '20 min',
                preview: true,
                locked: false,
              },
              {
                title: 'Chandelles',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: false,
              },
              {
                title: 'Lazy Eights',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Steep Spirals',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Eights on Pylons',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Maneuvers Assessment',
                type: 'quiz',
                duration: '30 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Commercial Operations',
            description: 'Professional flying procedures and operations',
            order: 2,
            duration: 220,
            lessons: [
              {
                title: 'Commercial Regulations',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Night Operations',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'High Altitude Operations',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Crew Resource Management',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Risk Management',
                type: 'reading',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Operations Exam',
                type: 'exam',
                duration: '40 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Cross-Country Operations',
            description: 'Long-distance flight planning and execution',
            order: 3,
            duration: 180,
            lessons: [
              {
                title: 'Advanced Flight Planning',
                type: 'video',
                duration: '40 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Weather Analysis',
                type: 'video',
                duration: '35 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Navigation Systems',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Fuel Management',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Diversion Procedures',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Cross-Country Test',
                type: 'exam',
                duration: '20 min',
                preview: false,
                locked: true,
              },
            ],
          },
          {
            title: 'Check Ride Preparation',
            description: 'Prepare for FAA commercial pilot practical test',
            order: 4,
            duration: 120,
            lessons: [
              {
                title: 'Oral Exam Preparation',
                type: 'video',
                duration: '30 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Flight Test Standards',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Common Mistakes to Avoid',
                type: 'video',
                duration: '25 min',
                preview: false,
                locked: true,
              },
              {
                title: 'Mock Check Ride',
                type: 'simulator',
                duration: '40 min',
                preview: false,
                locked: true,
              },
            ],
          },
        ],
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const courseData of coursesData) {
      // Check if course already exists
      const existingCourse = await coursesService
        .findBySlug(courseData.slug)
        .catch(() => null);

      try {
        if (existingCourse) {
          // Update existing course with new data including lessons
          await coursesService.update(
            existingCourse.id || existingCourse._id,
            courseData as any,
            instructor.id || instructor._id,
            UserRole.ADMIN,
          );
          logger.log(`🔄 Updated course: ${courseData.title}`);
          skippedCount++;
        } else {
          // Create new course
          await coursesService.create(
            courseData as any,
            instructor.id || instructor._id,
          );
          logger.log(`✅ Created course: ${courseData.title}`);
          createdCount++;
        }
      } catch (error) {
        logger.error(
          `❌ Failed to process course: ${courseData.title}`,
          error.message,
        );
      }
    }

    logger.log(`\n🎉 Course seeding completed!`);
    logger.log(`   Created: ${createdCount} courses`);
    logger.log(`   Skipped: ${skippedCount} courses (already exist)`);
    logger.log(`   Total: ${coursesData.length} courses\n`);
  } catch (error) {
    logger.error('❌ Course seeding failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedCourses();
