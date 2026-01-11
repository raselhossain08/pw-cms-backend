import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { CoursesService } from '../src/courses/courses.service';
import { CourseModulesService } from '../src/course-modules/course-modules.service';
import { UsersService } from '../src/users/users.service';
import { LessonType, LessonStatus } from '../src/courses/entities/lesson.entity';
import { CourseModuleStatus } from '../src/course-modules/entities/course-module.entity';
import { CourseLevel, CourseType, CourseStatus } from '../src/courses/entities/course.entity';
import { UserRole } from '../src/users/entities/user.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const coursesService = app.get(CoursesService);
    const modulesService = app.get(CourseModulesService);
    const usersService = app.get(UsersService);

    console.log('🚀 Quick Demo Seed - Creating sample data...\n');

    try {
        // Get or create instructor
        let instructor = await usersService.findByEmail('demo@example.com');
        if (!instructor) {
            instructor = await usersService.create({
                firstName: 'Demo',
                lastName: 'Instructor',
                email: 'demo@example.com',
                password: 'demo123',
                role: UserRole.INSTRUCTOR,
            });
        }

        // Single demo course
        const course = await coursesService.create(
            {
                title: 'Modern Web Development Complete Guide',
                slug: 'modern-web-dev-guide',
                description: 'Learn HTML, CSS, JavaScript, React, and Node.js from scratch',
                level: CourseLevel.BEGINNER,
                type: CourseType.THEORETICAL,
                price: 99.99,
                duration: 360,
                isFeatured: true,
                maxStudents: 100,
            },
            (instructor as any)._id.toString(),
        );

        console.log(`✓ Course: ${course.title}`);

        // Module 1: Introduction
        const module1 = await modulesService.create(
            {
                title: 'Getting Started',
                courseId: (course as any)._id.toString(),
                description: 'Introduction to web development',
                duration: 60,
                order: 1,
            },
            (instructor as any)._id.toString(),
            UserRole.INSTRUCTOR,
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'Welcome to Web Development',
                description: 'Course introduction',
                type: LessonType.VIDEO,
                content: 'Welcome to the course!',
                duration: 600,
                isFree: true,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 1,
                moduleId: (module1 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'Setting Up Your Environment',
                description: 'Development environment setup',
                type: LessonType.VIDEO,
                content: 'Learn to setup your development tools',
                duration: 900,
                isFree: true,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 2,
                moduleId: (module1 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        // Module 2: HTML & CSS
        const module2 = await modulesService.create(
            {
                title: 'HTML & CSS Fundamentals',
                courseId: (course as any)._id.toString(),
                description: 'Learn the building blocks of web pages',
                duration: 120,
                order: 2,
            },
            (instructor as any)._id.toString(),
            UserRole.INSTRUCTOR,
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'HTML Basics',
                description: 'HTML fundamentals',
                type: LessonType.VIDEO,
                content: 'Learn HTML tags and structure',
                duration: 1200,
                isFree: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 1,
                moduleId: (module2 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'CSS Styling',
                description: 'CSS fundamentals',
                type: LessonType.VIDEO,
                content: 'Style your web pages with CSS',
                duration: 1500,
                isFree: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 2,
                moduleId: (module2 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'Build Your First Webpage',
                description: 'Hands-on project',
                type: LessonType.ASSIGNMENT,
                content: 'Create a complete webpage from scratch',
                duration: 3600,
                isFree: false,
                status: LessonStatus.PUBLISHED,
                order: 3,
                moduleId: (module2 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        // Module 3: JavaScript
        const module3 = await modulesService.create(
            {
                title: 'JavaScript Programming',
                courseId: (course as any)._id.toString(),
                description: 'Master JavaScript fundamentals',
                duration: 180,
                order: 3,
            },
            (instructor as any)._id.toString(),
            UserRole.INSTRUCTOR,
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'JavaScript Basics',
                description: 'JavaScript fundamentals',
                type: LessonType.VIDEO,
                content: 'Learn JavaScript syntax and basics',
                duration: 1800,
                isFree: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 1,
                moduleId: (module3 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'DOM Manipulation',
                description: 'Working with the DOM',
                type: LessonType.VIDEO,
                content: 'Learn to manipulate web pages with JavaScript',
                duration: 2100,
                isFree: false,
                videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                status: LessonStatus.PUBLISHED,
                order: 2,
                moduleId: (module3 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        await coursesService.createLesson(
            (course as any)._id.toString(),
            {
                title: 'JavaScript Quiz',
                description: 'Test your knowledge',
                type: LessonType.QUIZ,
                content: 'Quiz covering JavaScript fundamentals',
                duration: 900,
                isFree: false,
                status: LessonStatus.PUBLISHED,
                order: 3,
                moduleId: (module3 as any)._id.toString(),
            },
            (instructor as any)._id.toString(),
        );

        console.log('\n✅ Demo data created successfully!');
        console.log('═══════════════════════════════════════');
        console.log('📊 Created:');
        console.log('   • 1 Course');
        console.log('   • 3 Modules');
        console.log('   • 8 Lessons');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap();
