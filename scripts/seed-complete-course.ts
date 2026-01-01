import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CoursesService } from '../src/courses/courses.service';
import { CourseLevel, CourseType } from '../src/courses/entities/course.entity';

async function seedCompleteCourse() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const coursesService = app.get(CoursesService);

    try {
        console.log('🚀 Starting complete course creation...\n');

        // Complete course data with all new features
        const completeCourseData = {
            title: 'Professional Boeing 737 Type Rating Course',
            slug: 'professional-boeing-737-type-rating-course',
            excerpt:
                'Master the Boeing 737 aircraft with comprehensive training from experienced airline captains. Get certified and fly for major airlines worldwide.',
            description:
                '<h2>Course Overview</h2><p>This comprehensive Boeing 737 Type Rating course is designed for professional pilots seeking to qualify on one of the world\'s most popular commercial aircraft. Our program combines theoretical knowledge with practical simulator training to ensure you\'re fully prepared for airline operations.</p><h3>Why Choose This Course?</h3><ul><li>Taught by experienced Boeing 737 captains with 10,000+ flight hours</li><li>State-of-the-art Level D full-motion simulators</li><li>FAA and EASA approved training program</li><li>Job placement assistance with partner airlines</li><li>Flexible scheduling options</li></ul>',
            content:
                '<h2>Complete Curriculum</h2><h3>Phase 1: Ground School (40 hours)</h3><p>Comprehensive systems training covering:</p><ul><li>Aircraft General Knowledge</li><li>Flight Controls & Hydraulics</li><li>Electrical Systems</li><li>Powerplant & APU</li><li>Environmental Control Systems</li><li>Fire Protection & Pneumatics</li><li>Ice & Rain Protection</li><li>Landing Gear & Brakes</li><li>Flight Management System (FMS)</li><li>Autoflight Systems</li></ul><h3>Phase 2: Simulator Training (20 sessions)</h3><p>Full motion Level D simulator training including:</p><ul><li>Normal Procedures</li><li>Abnormal & Emergency Procedures</li><li>Engine Failures</li><li>System Malfunctions</li><li>Weather Scenarios</li><li>RNAV/RNP Operations</li><li>Low Visibility Operations</li><li>CRM Training</li></ul><h3>Phase 3: Skill Test Preparation</h3><p>Final preparation for type rating checkride with examiner briefings and practice sessions.</p>',
            level: CourseLevel.ADVANCED,
            type: CourseType.COMBINED,
            price: 12999.99,
            originalPrice: 15999.99,
            isFree: false,
            duration: 60,
            maxStudents: 12,
            categories: [
                'Type Rating',
                'Boeing Training',
                'Airline Transition',
                'Professional Aviation',
            ],
            tags: [
                'Boeing 737',
                'Type Rating',
                'Airline Pilot',
                'Simulator Training',
                'FAA Approved',
                'EASA Approved',
            ],
            aircraftTypes: [
                'Boeing 737-700',
                'Boeing 737-800',
                'Boeing 737-900',
                'Boeing 737 MAX 8',
                'Boeing 737 MAX 9',
            ],
            prerequisites: [
                'Valid Commercial Pilot License (CPL) or Airline Transport Pilot License (ATPL)',
                'Multi-Engine Rating',
                'Instrument Rating',
                'Valid Class 1 Medical Certificate',
                'English Language Proficiency Level 4 or higher',
                'Minimum 1,500 total flight hours recommended',
                'Recent flight experience within last 12 months',
            ],
            learningObjectives: [
                'Master all Boeing 737 aircraft systems and operations',
                'Perform normal, abnormal, and emergency procedures with proficiency',
                'Operate the Flight Management System (FMS) for all phases of flight',
                'Execute precision approaches including CAT II/III operations',
                'Demonstrate effective Crew Resource Management (CRM)',
                'Handle complex weather scenarios and system failures',
                'Navigate using RNAV and RNP procedures',
                'Pass FAA/EASA Type Rating Skill Test on first attempt',
                'Understand airline standard operating procedures',
                'Develop professional airline pilot mindset and discipline',
            ],
            outcomes: [
                'Boeing 737 Type Rating Certificate',
                'Comprehensive Study Materials & Manuals',
                'Simulator Training Logbook',
                'Job Interview Preparation Package',
                'Lifetime Access to Course Updates',
                'Alumni Network Membership',
                'Career Counseling Session',
            ],
            isFeatured: true,
            providesCertificate: true,
            moneyBackGuarantee: 30,
            language: 'en',
            thumbnail:
                'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
        };

        console.log('📋 Course Details:');
        console.log(`   Title: ${completeCourseData.title}`);
        console.log(`   Level: ${completeCourseData.level}`);
        console.log(`   Type: ${completeCourseData.type}`);
        console.log(`   Price: $${completeCourseData.price}`);
        console.log(`   Duration: ${completeCourseData.duration} hours`);
        console.log(`   Aircraft: ${completeCourseData.aircraftTypes.join(', ')}`);
        console.log(`   Featured: ${completeCourseData.isFeatured ? '⭐ Yes' : 'No'}`);
        console.log(
            `   Certificate: ${completeCourseData.providesCertificate ? '🎓 Yes' : 'No'}`,
        );
        console.log(
            `   Money Back: ${completeCourseData.moneyBackGuarantee} days\n`,
        );

        // Get the first instructor from database
        console.log('🔍 Finding instructor...');
        const User = app.get('UserModel');
        const instructor = await User.findOne({
            role: { $in: ['instructor', 'admin', 'super_admin'] },
        });

        if (!instructor) {
            console.error('❌ No instructor found! Please create a user first.');
            await app.close();
            return;
        }

        console.log(`✅ Found instructor: ${instructor.firstName} ${instructor.lastName}\n`);

        // Create the course
        console.log('💾 Creating course in database...');
        const course = await coursesService.create(
            completeCourseData as any,
            instructor._id.toString(),
        );

        console.log('✅ Course created successfully!\n');
        console.log('📊 Course Summary:');
        console.log(`   ID: ${course._id}`);
        console.log(`   Slug: ${course.slug}`);
        console.log(`   Status: ${course.status}`);
        console.log(`   Instructor: ${instructor.firstName} ${instructor.lastName}`);
        console.log(`   Categories: ${course.categories.join(', ')}`);
        console.log(`   Aircraft Types: ${course.aircraftTypes.join(', ')}`);
        console.log(`   Prerequisites: ${course.prerequisites.length} items`);
        console.log(`   Learning Objectives: ${course.learningObjectives.length} items`);
        console.log(
            `   Outcomes: ${course.outcomes ? course.outcomes.length : 0} items\n`,
        );

        console.log('🌐 Access URLs:');
        console.log(
            `   Frontend: http://localhost:3001/courses/${course.slug}`,
        );
        console.log(
            `   Dashboard: http://localhost:3000/courses\n`,
        );

        console.log('🎉 Complete course seed finished successfully!');
    } catch (error) {
        console.error('❌ Error creating course:', error);
        throw error;
    } finally {
        await app.close();
    }
}

seedCompleteCourse()
    .then(() => {
        console.log('\n✨ Done! Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Fatal error:', error);
        process.exit(1);
    });
