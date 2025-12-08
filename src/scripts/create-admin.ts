import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { UserRole, UserStatus } from '../users/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);

  try {
    // Get admin credentials from environment variables
    const adminEmail =
      configService.get<string>('SUPER_ADMIN_EMAIL') ||
      'admin@personalwings.com';
    const adminPassword =
      configService.get<string>('SUPER_ADMIN_PASSWORD') || 'Admin123@@';
    const adminFirstName =
      configService.get<string>('SUPER_ADMIN_FIRST_NAME') || 'Super';
    const adminLastName =
      configService.get<string>('SUPER_ADMIN_LAST_NAME') || 'Admin';

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env file',
      );
    }

    console.log('🔄 Creating/Updating Super Admin with email:', adminEmail);

    // Check if admin already exists
    const existingUser = await usersService.findByEmail(adminEmail);

    if (existingUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const userId = String(existingUser._id);
      await usersService.resetPassword(userId, hashedPassword);
      await usersService.update(userId, {
        firstName: adminFirstName,
        lastName: adminLastName,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });
      await usersService.verifyEmail(userId);
      console.log('✅ Existing user updated to SUPER_ADMIN');
      console.log('Email:', adminEmail);
      console.log('Name:', `${adminFirstName} ${adminLastName}`);
      console.log('Password reset successfully');
      console.log('User ID:', userId);
      console.log('Email Verified:', true);
      await app.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create super admin user
    const adminUser = await usersService.create({
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });

    await usersService.verifyEmail(String(adminUser._id));

    console.log('✅ Super Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Name:', `${adminFirstName} ${adminLastName}`);
    console.log('Password: [SET FROM ENV]');
    console.log('Role:', adminUser.role);
    console.log('Email Verified:', true);
    console.log('User ID:', adminUser._id);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await app.close();
  }
}

createAdmin();
