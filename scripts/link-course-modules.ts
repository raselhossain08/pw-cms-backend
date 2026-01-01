import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function linkCourseModules() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const CourseModel = app.get(getModelToken('Course'));
        const CourseModuleModel = app.get(getModelToken('CourseModule'));

        console.log('=== Linking Course Modules ===\n');

        // Get all courses
        const courses = await CourseModel.find().lean();

        for (const course of courses) {
            console.log(`\nProcessing: ${course.title} (${course.slug})`);

            // Find all modules for this course
            const modules = await CourseModuleModel.find({
                course: course._id,
            })
                .select('_id title order')
                .sort({ order: 1 })
                .lean();

            if (modules.length > 0) {
                const moduleIds = modules.map((m) => m._id);

                console.log(`  Found ${modules.length} modules:`);
                modules.forEach((m, i) => {
                    console.log(`    ${i + 1}. ${m.title} (Order: ${m.order})`);
                });

                // Update course with module IDs
                await CourseModel.findByIdAndUpdate(course._id, {
                    modules: moduleIds,
                });

                console.log(`  ✓ Linked ${modules.length} modules to course`);
            } else {
                console.log(`  - No modules found for this course`);
            }
        }

        console.log('\n=== Link Complete! ===');

        // Verify the links
        console.log('\n=== Verification ===');
        const verifiedCourses = await CourseModel.find()
            .populate({
                path: 'modules',
                populate: {
                    path: 'lessons',
                    select: 'title type duration order',
                },
            })
            .lean();

        for (const course of verifiedCourses) {
            console.log(`\n${course.title}:`);
            if (course.modules && course.modules.length > 0) {
                console.log(`  ✓ ${course.modules.length} modules linked`);
                course.modules.forEach((module: any, i: number) => {
                    const lessonCount = Array.isArray(module.lessons) ? module.lessons.length : 0;
                    console.log(`    ${i + 1}. ${module.title} - ${lessonCount} lessons`);

                    if (lessonCount > 0 && Array.isArray(module.lessons)) {
                        module.lessons.forEach((lesson: any, j: number) => {
                            console.log(`       ${j + 1}. ${lesson.title} (${lesson.type}, ${lesson.duration}s)`);
                        });
                    }
                });
            } else {
                console.log(`  - No modules`);
            }
        }

        console.log('\n✅ All done!');
    } catch (error) {
        console.error('Error linking course modules:', error);
    } finally {
        await app.close();
    }
}

// Import getModelToken from @nestjs/mongoose
import { getModelToken } from '@nestjs/mongoose';

linkCourseModules();
