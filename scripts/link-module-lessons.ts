import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';

async function linkModuleLessons() {
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const CourseModuleModel = app.get(getModelToken('CourseModule'));
        const LessonModel = app.get(getModelToken('Lesson'));

        console.log('=== Linking Module Lessons ===\n');

        // Get all modules
        const modules = await CourseModuleModel.find().lean();

        for (const module of modules) {
            console.log(`\nProcessing Module: ${module.title}`);
            console.log(`  Module ID: ${module._id}`);

            // Find all lessons for this module
            const lessons = await LessonModel.find({
                module: module._id,
            })
                .select('_id title order type duration')
                .sort({ order: 1 })
                .lean();

            console.log(`  Found ${lessons.length} lessons with module reference`);

            // Also check by course ID if module field is missing
            const lessonsByCourse = await LessonModel.find({
                course: module.course,
                module: { $exists: false },
            })
                .select('_id title order type duration')
                .sort({ order: 1 })
                .lean();

            console.log(`  Found ${lessonsByCourse.length} lessons without module reference (by course)`);

            let allLessons = lessons;

            // If there are lessons by course, update them with the module reference
            if (lessonsByCourse.length > 0) {
                console.log('  Updating lessons to add module reference...');
                const lessonIds = lessonsByCourse.map((l) => l._id);

                await LessonModel.updateMany(
                    { _id: { $in: lessonIds } },
                    { $set: { module: module._id } }
                );

                allLessons = [...lessons, ...lessonsByCourse];
                console.log(`  ✓ Updated ${lessonsByCourse.length} lessons with module reference`);
            }

            if (allLessons.length > 0) {
                const lessonIds = allLessons.map((l) => l._id);

                console.log(`  Lessons to link:`);
                allLessons.forEach((l, i) => {
                    console.log(`    ${i + 1}. ${l.title} (${l.type}, ${l.duration}s, Order: ${l.order})`);
                });

                // Update module with lesson IDs
                await CourseModuleModel.findByIdAndUpdate(module._id, {
                    lessons: lessonIds,
                });

                console.log(`  ✓ Linked ${lessonIds.length} lessons to module`);
            } else {
                console.log(`  - No lessons found for this module`);
            }
        }

        console.log('\n=== Link Complete! ===');

        // Verify the links
        console.log('\n=== Verification ===');
        const verifiedModules = await CourseModuleModel.find()
            .populate('lessons')
            .lean();

        for (const module of verifiedModules) {
            console.log(`\nModule: ${module.title}`);
            if (module.lessons && module.lessons.length > 0) {
                console.log(`  ✓ ${module.lessons.length} lessons linked`);
                module.lessons.forEach((lesson: any, i: number) => {
                    console.log(`    ${i + 1}. ${lesson.title} (${lesson.type}, ${lesson.duration}s)`);
                });
            } else {
                console.log(`  - No lessons`);
            }
        }

        console.log('\n✅ All done!');
    } catch (error) {
        console.error('Error linking module lessons:', error);
    } finally {
        await app.close();
    }
}

linkModuleLessons();
