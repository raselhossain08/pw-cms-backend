import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CoursesService } from '../src/courses/courses.service';
import { CourseModulesService } from '../src/course-modules/course-modules.service';
import { UsersService } from '../src/users/users.service';
import { LessonType, LessonStatus } from '../src/courses/entities/lesson.entity';
import { CourseModuleStatus } from '../src/course-modules/entities/course-module.entity';
import { UserRole } from '../src/users/entities/user.entity';
import { CourseType, CourseStatus } from '../src/courses/entities/course.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const coursesService = app.get(CoursesService);
    const modulesService = app.get(CourseModulesService);
    const usersService = app.get(UsersService);

    console.log('🌱 Starting seed process for Aviation Courses...\n');

    try {
        // Delete all existing courses, modules, and lessons
        console.log('🗑️  Deleting all existing data...');
        await coursesService['lessonModel'].deleteMany({});
        console.log('   ✓ Deleted all lessons');
        await modulesService['moduleModel'].deleteMany({});
        console.log('   ✓ Deleted all modules');
        await coursesService['courseModel'].deleteMany({});
        console.log('   ✓ Deleted all courses\n');

        // Get or create instructor user
        let instructor = await usersService.findByEmail('instructor@personalwings.com');
        if (!instructor) {
            console.log('Creating instructor user...');
            instructor = await usersService.create({
                firstName: 'Captain',
                lastName: 'Instructor',
                email: 'instructor@personalwings.com',
                password: 'password123',
                role: UserRole.INSTRUCTOR,
            });
        }

        // Aviation courses data
        const coursesData = [
            {
                title: 'Private Pilot License (PPL) Ground School',
                slug: 'private-pilot-license-ppl-ground-school',
                description: 'Complete ground training for Private Pilot License. Learn aircraft systems, meteorology, navigation, regulations, and aerodynamics to pass your PPL written exam.',
                level: 'beginner',
                type: CourseType.THEORETICAL,
                status: CourseStatus.PUBLISHED,
                duration: 2400, // 40 hours
                price: 499.99,
                isFeatured: true,
                category: 'Private Pilot License',
            },
            {
                title: 'Commercial Pilot License (CPL) Complete Training',
                slug: 'commercial-pilot-license-cpl-training',
                description: 'Advanced flight training program for Commercial Pilot License. Master complex aircraft operations, instrument procedures, and commercial pilot privileges.',
                level: 'intermediate',
                type: CourseType.COMBINED,
                status: CourseStatus.PUBLISHED,
                duration: 3600, // 60 hours
                price: 899.99,
                isFeatured: true,
                category: 'Commercial Pilot License',
            },
            {
                title: 'Instrument Rating (IR) Comprehensive Course',
                slug: 'instrument-rating-ir-comprehensive',
                description: 'Master instrument flying techniques, IFR procedures, and weather operations. Learn to fly safely in instrument meteorological conditions.',
                level: 'intermediate',
                type: CourseType.PRACTICAL,
                status: CourseStatus.PUBLISHED,
                duration: 3000, // 50 hours
                price: 749.99,
                isFeatured: true,
                category: 'Instrument Rating',
            },
            {
                title: 'Flight Instructor Certificate (CFI) Training',
                slug: 'flight-instructor-certificate-cfi',
                description: 'Become a certified flight instructor. Learn teaching techniques, lesson planning, and advanced flight maneuvers to train the next generation of pilots.',
                level: 'advanced',
                type: CourseType.COMBINED,
                status: CourseStatus.PUBLISHED,
                duration: 4200, // 70 hours
                price: 1199.99,
                isFeatured: false,
                category: 'Flight Instructor',
            },
            {
                title: 'Multi-Engine Rating Complete Course',
                slug: 'multi-engine-rating-course',
                description: 'Learn to fly multi-engine aircraft. Master engine-out procedures, complex systems, and advanced flight operations for twin-engine aircraft.',
                level: 'intermediate',
                type: CourseType.PRACTICAL,
                status: CourseStatus.PUBLISHED,
                duration: 1800, // 30 hours
                price: 599.99,
                isFeatured: false,
                category: 'Multi-Engine Rating',
            },
            {
                title: 'Aviation Weather & Meteorology Mastery',
                slug: 'aviation-weather-meteorology-mastery',
                description: 'Deep dive into aviation weather systems, forecasting, and meteorological hazards. Make better flight decisions with comprehensive weather knowledge.',
                level: 'beginner',
                type: CourseType.THEORETICAL,
                status: CourseStatus.PUBLISHED,
                duration: 1200, // 20 hours
                price: 299.99,
                isFeatured: false,
                category: 'Aviation Theory',
            },
        ];

        // Modules data templates
        const modulesTemplates = [
            {
                title: 'Course Introduction & Prerequisites',
                description: 'Welcome to the course. Learn about the training structure, requirements, and what to expect.',
                duration: 120,
                order: 1,
            },
            {
                title: 'Aircraft Systems & Components',
                description: 'Comprehensive study of aircraft systems, instruments, and mechanical components.',
                duration: 240,
                order: 2,
            },
            {
                title: 'Flight Theory & Aerodynamics',
                description: 'Master the principles of flight, lift, drag, thrust, and aircraft performance.',
                duration: 300,
                order: 3,
            },
            {
                title: 'Navigation & Flight Planning',
                description: 'Learn navigation techniques, chart reading, flight planning, and cross-country procedures.',
                duration: 360,
                order: 4,
            },
            {
                title: 'Regulations & Air Law',
                description: 'Study aviation regulations, airspace classifications, and pilot responsibilities.',
                duration: 180,
                order: 5,
            },
            {
                title: 'Exam Preparation & Practice',
                description: 'Final review, practice tests, and comprehensive exam preparation strategies.',
                duration: 200,
                order: 6,
            },
        ];

        // Lessons data templates
        const lessonsTemplates = {
            intro: [
                {
                    title: 'Welcome to Aviation Training',
                    type: LessonType.VIDEO,
                    duration: 600,
                    isFree: true,
                    content: 'Welcome to your aviation training course! Learn about the course structure, certification process, and your path to becoming a pilot.',
                    videoUrl: 'https://www.youtube.com/watch?v=aviation-intro',
                },
                {
                    title: 'Pilot Requirements & Medical Certificate',
                    type: LessonType.VIDEO,
                    duration: 900,
                    isFree: true,
                    content: 'Understanding pilot medical requirements, certification categories, and the medical examination process.',
                    videoUrl: 'https://www.youtube.com/watch?v=medical-cert',
                },
                {
                    title: 'Course Materials & Study Guide',
                    type: LessonType.TEXT,
                    duration: 300,
                    isFree: true,
                    content: '# Training Materials\n\n## Required Resources\n- FAA Regulations Handbook\n- Aircraft Operating Manual\n- Navigation Charts\n- Flight Computer & Plotter\n\n## Online Resources\nAccess to flight simulators and practice exams.',
                },
                {
                    title: 'Pre-Course Assessment',
                    type: LessonType.QUIZ,
                    duration: 600,
                    isFree: false,
                    content: 'Assess your current aviation knowledge before starting the detailed course content.',
                },
            ],
            core: [
                {
                    title: 'Aircraft Structure & Components',
                    type: LessonType.VIDEO,
                    duration: 1200,
                    isFree: false,
                    content: 'Comprehensive overview of aircraft construction, major components, and structural elements.',
                    videoUrl: 'https://www.youtube.com/watch?v=aircraft-structure',
                },
                {
                    title: 'Engine Systems & Powerplant',
                    type: LessonType.VIDEO,
                    duration: 1500,
                    isFree: false,
                    content: 'Detailed study of aircraft engines, fuel systems, ignition, and powerplant operations.',
                    videoUrl: 'https://www.youtube.com/watch?v=engine-systems',
                },
                {
                    title: 'Pre-Flight Inspection Assignment',
                    type: LessonType.ASSIGNMENT,
                    duration: 3600,
                    isFree: false,
                    content: 'Complete a thorough pre-flight inspection checklist for your assigned aircraft type.',
                },
                {
                    title: 'Aircraft Systems Best Practices',
                    type: LessonType.TEXT,
                    duration: 900,
                    isFree: false,
                    content: '# Aircraft Systems Best Practices\n\n## System Monitoring\n- Engine instruments\n- Electrical systems\n- Fuel management\n\n## Emergency Procedures\n- Engine failure\n- Electrical failure\n- System malfunctions',
                },
                {
                    title: 'Aircraft Systems Knowledge Test',
                    type: LessonType.QUIZ,
                    duration: 900,
                    isFree: false,
                    content: 'Comprehensive assessment of aircraft systems, components, and operations.',
                },
            ],
            intermediate: [
                {
                    title: 'Principles of Flight Introduction',
                    type: LessonType.VIDEO,
                    duration: 1800,
                    isFree: false,
                    content: 'Understanding the four forces of flight: lift, weight, thrust, and drag.',
                    videoUrl: 'https://www.youtube.com/watch?v=principles-flight',
                },
                {
                    title: 'Aerodynamics & Airfoils',
                    type: LessonType.VIDEO,
                    duration: 2400,
                    isFree: false,
                    content: 'Deep dive into wing design, airfoil theory, and boundary layer aerodynamics.',
                    videoUrl: 'https://www.youtube.com/watch?v=aerodynamics',
                },
                {
                    title: 'Aircraft Performance & Limitations',
                    type: LessonType.VIDEO,
                    duration: 2100,
                    isFree: false,
                    content: 'Learn about weight and balance, performance charts, and aircraft limitations.',
                    videoUrl: 'https://www.youtube.com/watch?v=performance',
                },
                {
                    title: 'Weight & Balance Calculations',
                    type: LessonType.ASSIGNMENT,
                    duration: 7200,
                    isFree: false,
                    content: 'Calculate weight and balance for various flight scenarios and aircraft configurations.',
                },
                {
                    title: 'Flight Theory Study Guide',
                    type: LessonType.TEXT,
                    duration: 1200,
                    isFree: false,
                    content: '# Aerodynamics Study Guide\n\n## Key Concepts\n- Bernoulli\'s principle\n- Angle of attack\n- Stall characteristics\n\n## Performance Factors\n- Density altitude\n- Wind effects\n- Load factor',
                },
            ],
            advanced: [
                {
                    title: 'VOR Navigation & Radials',
                    type: LessonType.VIDEO,
                    duration: 2700,
                    isFree: false,
                    content: 'Master VOR navigation, tracking radials, and intercept procedures.',
                    videoUrl: 'https://www.youtube.com/watch?v=vor-navigation',
                },
                {
                    title: 'GPS Navigation & Flight Planning',
                    type: LessonType.VIDEO,
                    duration: 3000,
                    isFree: false,
                    content: 'Modern GPS navigation, RNAV procedures, and electronic flight planning tools.',
                    videoUrl: 'https://www.youtube.com/watch?v=gps-navigation',
                },
                {
                    title: 'Cross-Country Flight Planning',
                    type: LessonType.VIDEO,
                    duration: 2400,
                    isFree: false,
                    content: 'Complete guide to planning cross-country flights including weather, fuel, alternates, and NOTAMs.',
                    videoUrl: 'https://www.youtube.com/watch?v=flight-planning',
                },
                {
                    title: 'Navigation Knowledge Test',
                    type: LessonType.QUIZ,
                    duration: 1800,
                    isFree: false,
                    content: 'Comprehensive navigation exam covering VOR, GPS, dead reckoning, and flight planning.',
                },
            ],
            project: [
                {
                    title: 'FAR/AIM Regulations Overview',
                    type: LessonType.TEXT,
                    duration: 1800,
                    isFree: false,
                    content: '# Federal Aviation Regulations\n\n## Part 61 - Pilot Certification\n- Student pilot requirements\n- Private pilot privileges\n- Flight experience requirements\n\n## Part 91 - General Operating Rules\n- Right-of-way rules\n- Flight plan requirements\n- Equipment requirements',
                },
                {
                    title: 'Airspace Classifications & Requirements',
                    type: LessonType.VIDEO,
                    duration: 4500,
                    isFree: false,
                    content: 'Master Class A through G airspace, special use airspace, and operating requirements.',
                    videoUrl: 'https://www.youtube.com/watch?v=airspace',
                },
                {
                    title: 'Radio Communications & Phraseology',
                    type: LessonType.VIDEO,
                    duration: 4200,
                    isFree: false,
                    content: 'Learn proper radio communication procedures, standard phraseology, and ATC interactions.',
                    videoUrl: 'https://www.youtube.com/watch?v=radio-comms',
                },
                {
                    title: 'Emergency Procedures & Decision Making',
                    type: LessonType.VIDEO,
                    duration: 3600,
                    isFree: false,
                    content: 'Emergency checklists, decision-making under pressure, and pilot judgment scenarios.',
                    videoUrl: 'https://www.youtube.com/watch?v=emergencies',
                },
                {
                    title: 'Aviation Weather Services',
                    type: LessonType.VIDEO,
                    duration: 2700,
                    isFree: false,
                    content: 'Understanding METARs, TAFs, weather charts, and aviation weather products.',
                    videoUrl: 'https://www.youtube.com/watch?v=weather-services',
                },
                {
                    title: 'Regulations Scenario Assignment',
                    type: LessonType.ASSIGNMENT,
                    duration: 10800,
                    isFree: false,
                    content: 'Apply FAR knowledge to real-world scenarios and decision-making exercises.',
                },
            ],
            testing: [
                {
                    title: 'Testing Fundamentals',
                    type: LessonType.VIDEO,
                    duration: 1800,
                    isFree: false,
                    content: 'Learn the fundamentals of testing and why it matters.',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                    title: 'Unit Testing',
                    type: LessonType.VIDEO,
                    duration: 2400,
                    isFree: false,
                    content: 'Write effective unit tests for your code.',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                    title: 'Integration & E2E Testing',
                    type: LessonType.VIDEO,
                    duration: 2700,
                    isFree: false,
                    content: 'Implement integration and end-to-end testing strategies.',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                    title: 'Performance Optimization',
                    type: LessonType.VIDEO,
                    duration: 2100,
                    isFree: false,
                    content: 'Optimize your application for maximum performance.',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
                {
                    title: 'Final Assessment',
                    type: LessonType.QUIZ,
                    duration: 2400,
                    isFree: false,
                    content: 'Comprehensive final assessment covering all course topics.',
                },
            ],
        };

        let totalCourses = 0;
        let totalModules = 0;
        let totalLessons = 0;

        // Create courses with modules and lessons
        for (const courseData of coursesData) {
            console.log(`\n📚 Creating course: ${courseData.title}`);

            const course = await coursesService.create(courseData as any, (instructor as any)._id.toString());
            totalCourses++;
            console.log(`   ✓ Course created with ID: ${course._id}`);

            // Create modules for this course
            const lessonSets = [
                lessonsTemplates.intro,
                lessonsTemplates.core,
                lessonsTemplates.intermediate,
                lessonsTemplates.advanced,
                lessonsTemplates.project,
                lessonsTemplates.testing,
            ];

            for (let i = 0; i < modulesTemplates.length; i++) {
                const moduleTemplate = modulesTemplates[i];
                console.log(`   📦 Creating module: ${moduleTemplate.title}`);

                const module = await modulesService.create(
                    {
                        title: moduleTemplate.title,
                        courseId: (course as any)._id.toString(),
                        description: moduleTemplate.description,
                        duration: moduleTemplate.duration,
                        order: moduleTemplate.order,
                    },
                    (instructor as any)._id.toString(),
                    UserRole.INSTRUCTOR,
                );
                totalModules++;
                console.log(`      ✓ Module created with ID: ${module._id}`);

                // Create lessons for this module
                const lessonSet = lessonSets[i] || lessonsTemplates.core;
                for (let j = 0; j < lessonSet.length; j++) {
                    const lessonTemplate = lessonSet[j];

                    // Generate unique slug using course slug and lesson title
                    const baseSlug = lessonTemplate.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    const uniqueSlug = `${courseData.slug}-${baseSlug}`;

                    const lesson = await coursesService.createLesson(
                        (course as any)._id.toString(),
                        {
                            title: lessonTemplate.title,
                            slug: uniqueSlug,
                            description: lessonTemplate.content,
                            type: lessonTemplate.type,
                            content: lessonTemplate.content,
                            duration: lessonTemplate.duration,
                            isFree: lessonTemplate.isFree,
                            videoUrl: lessonTemplate.videoUrl,
                            status: LessonStatus.PUBLISHED,
                            order: j + 1,
                            moduleId: (module as any)._id.toString(),
                        },
                        (instructor as any)._id.toString(),
                    );
                    totalLessons++;
                    console.log(`         ✓ Lesson: ${lessonTemplate.title}`);
                }
            }
        }

        console.log('\n\n✅ Seed completed successfully!');
        console.log('═══════════════════════════════════════');
        console.log(`📊 Summary:`);
        console.log(`   • Courses created:  ${totalCourses}`);
        console.log(`   • Modules created:  ${totalModules}`);
        console.log(`   • Lessons created:  ${totalLessons}`);
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap();
