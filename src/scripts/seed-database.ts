import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus } from '../users/entities/user.entity';

async function seed() {
  const logger = new Logger('DatabaseSeed');
  const app = await NestFactory.create(AppModule);

  try {
    const configService = app.get(ConfigService);
    const usersService = app.get(UsersService);

    // Create admin user
    const adminEmail = configService.get(
      'ADMIN_EMAIL',
      'admin@personalwings.com',
    );
    const adminPassword = configService.get(
      'ADMIN_PASSWORD',
      'SecureAdmin123!',
    );

    const existingAdmin = await usersService.findByEmail(adminEmail);

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      const admin = await usersService.create({
        email: adminEmail,
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });

      logger.log(`✅ Admin user created: ${adminEmail}`);
    } else {
      logger.log(`⚠️  Admin user already exists: ${adminEmail}`);
    }

    // Create sample instructor
    const instructorEmail = 'instructor@personalwings.com';
    const existingInstructor = await usersService.findByEmail(instructorEmail);

    if (!existingInstructor) {
      const hashedPassword = await bcrypt.hash('instructor123', 12);

      await usersService.create({
        email: instructorEmail,
        firstName: 'Rich',
        lastName: 'Pickett',
        password: hashedPassword,
        role: UserRole.INSTRUCTOR,
        status: UserStatus.ACTIVE,
        slug: 'captain-rich-pickett',
        bio: 'Captain Rich Pickett is a highly experienced aviation professional with over 40 years of flying experience. As a Chief Flight Instructor, he specializes in high-performance aircraft training, jet transition programs, and advanced avionics instruction. Rich is passionate about aviation safety and has trained over 1,000 pilots throughout his distinguished career.',
        certifications: [
          'ATP Certificate',
          'CFI/CFII/MEI',
          'Citation Type Rating',
          'Eclipse Jet Type Rating',
          'High Performance Endorsement',
          'Complex Aircraft Endorsement',
        ],
        flightHours: 5000,
        phone: '+1 (619) 555-0123',
        country: 'United States',
        state: 'California',
        city: 'San Diego',
      });

      logger.log(`✅ Sample instructor created: ${instructorEmail}`);
    } else {
      // Update existing instructor with slug and additional data
      await usersService.update((existingInstructor as any)._id.toString(), {
        firstName: 'Rich',
        lastName: 'Pickett',
        slug: 'captain-rich-pickett',
        bio: 'Captain Rich Pickett is a highly experienced aviation professional with over 40 years of flying experience. As a Chief Flight Instructor, he specializes in high-performance aircraft training, jet transition programs, and advanced avionics instruction. Rich is passionate about aviation safety and has trained over 1,000 pilots throughout his distinguished career.',
        certifications: [
          'ATP Certificate',
          'CFI/CFII/MEI',
          'Citation Type Rating',
          'Eclipse Jet Type Rating',
          'High Performance Endorsement',
          'Complex Aircraft Endorsement',
        ],
        flightHours: 5000,
        phone: '+1 (619) 555-0123',
        country: 'United States',
        state: 'California',
        city: 'San Diego',
      });
      logger.log(`✅ Instructor profile updated: ${instructorEmail}`);
    }

    // Create sample student
    const studentEmail = 'student@personalwings.com';
    const existingStudent = await usersService.findByEmail(studentEmail);

    if (!existingStudent) {
      const hashedPassword = await bcrypt.hash('student123', 12);

      await usersService.create({
        email: studentEmail,
        firstName: 'Jane',
        lastName: 'Student',
        password: hashedPassword,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      });

      logger.log(`✅ Sample student created: ${studentEmail}`);
    }

    logger.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
  } finally {
    await app.close();
  }
}

seed();
