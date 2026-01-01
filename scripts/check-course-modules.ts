import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

async function checkCourseModules() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const CourseModel = app.get(getModelToken('Course'));
        const CourseModuleModel = app.get(getModelToken('CourseModule'));
        const LessonModel = app.get(getModelToken('Lesson'));

        console.log('=== Checking Course Modules Setup ===\n');

        // Check total courses
        const totalCourses = await CourseModel.countDocuments();
        console.log(`Total Courses: ${totalCourses}`);

        // Check total modules
        const totalModules = await CourseModuleModel.countDocuments();
        console.log(`Total Course Modules: ${totalModules}`);

        // Check total lessons
        const totalLessons = await LessonModel.countDocuments();
        console.log(`Total Lessons: ${totalLessons}\n`);

        // Get a sample course with modules populated
        const sampleCourse = await CourseModel.findOne()
            .populate({
                path: 'modules',
                populate: {
                    path: 'lessons',
                    select: 'title duration order type status',
                },
            })
            .lean();

        if (sampleCourse) {
            console.log('=== Sample Course ===');
            console.log(`Course Title: ${sampleCourse.title}`);
            console.log(`Course Slug: ${sampleCourse.slug}`);
            console.log(`Modules Field Type: ${typeof sampleCourse.modules}`);
            console.log(`Modules Count: ${Array.isArray(sampleCourse.modules) ? sampleCourse.modules.length : 'Not an array'}`);

            if (Array.isArray(sampleCourse.modules) && sampleCourse.modules.length > 0) {
                console.log('\n=== Modules Details ===');
                sampleCourse.modules.forEach((module: any, index: number) => {
                    console.log(`\nModule ${index + 1}:`);
                    console.log(`  - ID: ${module._id}`);
                    console.log(`  - Title: ${module.title}`);
                    console.log(`  - Lessons: ${Array.isArray(module.lessons) ? module.lessons.length : 'Not populated'}`);

                    if (Array.isArray(module.lessons) && module.lessons.length > 0) {
                        console.log('  - Lesson Details:');
                        module.lessons.forEach((lesson: any, lIndex: number) => {
                            console.log(`    ${lIndex + 1}. ${lesson.title} (${lesson.type}, ${lesson.duration}s)`);
                        });
                    }
                });
            } else {
                console.log('\n⚠️  No modules found for this course!');
                console.log('Checking if modules exist separately...\n');

                // Check if modules exist but not linked
                const modulesForCourse = await CourseModuleModel.find({
                    course: sampleCourse._id,
                })
                    .populate('lessons')
                    .lean();

                if (modulesForCourse.length > 0) {
                    console.log(`✓ Found ${modulesForCourse.length} modules for this course (but not linked in Course.modules field)`);
                    console.log('\nModule Details:');
                    modulesForCourse.forEach((module: any, index: number) => {
                        console.log(`\n${index + 1}. ${module.title}`);
                        console.log(`   - Lessons: ${Array.isArray(module.lessons) ? module.lessons.length : 0}`);
                        if (Array.isArray(module.lessons) && module.lessons.length > 0) {
                            module.lessons.forEach((lesson: any) => {
                                console.log(`     - ${lesson.title}`);
                            });
                        }
                    });

                    console.log('\n⚠️  ISSUE FOUND: Modules exist but Course.modules array is empty!');
                    console.log('Need to update courses to link their modules.\n');
                } else {
                    console.log('✗ No modules found at all for this course.');
                }
            }
        } else {
            console.log('No courses found in database!');
        }

        // Check all courses and their modules status
        console.log('\n=== All Courses Module Status ===');
        const allCourses = await CourseModel.find().select('title slug modules').lean();

        for (const course of allCourses) {
            const moduleCount = Array.isArray(course.modules) ? course.modules.length : 0;
            const actualModules = await CourseModuleModel.countDocuments({ course: course._id });

            console.log(`\nCourse: ${course.title}`);
            console.log(`  - Slug: ${course.slug}`);
            console.log(`  - Modules in Course.modules: ${moduleCount}`);
            console.log(`  - Actual modules in DB: ${actualModules}`);

            if (moduleCount !== actualModules) {
                console.log(`  ⚠️  MISMATCH: Course has ${actualModules} modules but only ${moduleCount} linked!`);
            }
        }

    } catch (error) {
        console.error('Error checking course modules:', error);
    } finally {
        await app.close();
    }
}

checkCourseModules();
