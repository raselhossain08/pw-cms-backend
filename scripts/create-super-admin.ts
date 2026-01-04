import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../src/users/entities/user.entity';

async function createSuperAdmin() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);

    try {
        // Check if super admin already exists
        const existingUser = await usersService.findByEmail('raselhossain86666@gmail.com');

        if (existingUser) {
            console.log('✅ User already exists with email: raselhossain86666@gmail.com');
            console.log(`Current role: ${existingUser.role}`);

            // Update to super_admin if not already
            if (existingUser.role !== UserRole.SUPER_ADMIN) {
                console.log('📝 Updating user role to super_admin...');
                await usersService.update((existingUser as any)._id.toString(), {
                    role: UserRole.SUPER_ADMIN,
                    status: UserStatus.ACTIVE,
                } as any);
                console.log('✅ User role updated to super_admin successfully!');
            } else {
                console.log('✅ User is already a super_admin');
            }

            console.log('\n📧 Email: raselhossain86666@gmail.com');
            console.log('🔑 Password: Admin123@@');
            console.log('👤 Role: super_admin');
            console.log('✅ Status: active');

        } else {
            console.log('📝 Creating new super admin user...');

            // Hash the password
            const hashedPassword = await bcrypt.hash('Admin123@@', 10);

            // Create the user directly
            const superAdmin = await usersService.create({
                email: 'raselhossain86666@gmail.com',
                password: hashedPassword,
                firstName: 'Super',
                lastName: 'Admin',
                role: UserRole.SUPER_ADMIN,
                status: UserStatus.ACTIVE,
            });

            console.log('✅ Super admin created successfully!');
            console.log('\n📧 Email: raselhossain86666@gmail.com');
            console.log('🔑 Password: Admin123@@');
            console.log('👤 Role: super_admin');
            console.log(`🆔 User ID: ${(superAdmin as any)._id}`);
            console.log('✅ Status: active');
        }

        console.log('\n🎉 You can now login with these credentials!');

    } catch (error) {
        console.error('❌ Error creating super admin:', error.message);
        throw error;
    } finally {
        await app.close();
    }
}

createSuperAdmin()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });

