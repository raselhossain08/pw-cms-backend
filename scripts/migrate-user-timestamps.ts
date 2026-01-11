import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/users/entities/user.entity';
import { Model } from 'mongoose';

async function migrateUserTimestamps() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    try {
        console.log('Starting user timestamps migration...');

        const isInvalidDate = (value: any): boolean => {
            if (!value) return true;
            const date =
                value instanceof Date
                    ? value
                    : new Date(value);
            return !(date instanceof Date) || isNaN(date.getTime());
        };

        // Find all users to check their timestamp status
        const allUsers = await userModel.find({}).lean();
        console.log(`Found ${allUsers.length} total users`);

        interface UserUpdate {
            _id: any;
            updateData: {
                createdAt?: Date;
                updatedAt?: Date;
            };
        }

        const usersToUpdate: UserUpdate[] = [];
        const now = new Date();

        for (const user of allUsers) {
            let needsUpdate = false;
            const updateData: { createdAt?: Date; updatedAt?: Date } = {};

            // Check createdAt
            if (isInvalidDate(user.createdAt)) {
                updateData.createdAt = now;
                needsUpdate = true;
            }

            // Check updatedAt
            if (isInvalidDate(user.updatedAt)) {
                updateData.updatedAt = now;
                needsUpdate = true;
            }

            if (needsUpdate) {
                usersToUpdate.push({ _id: user._id, updateData });
            }
        }

        console.log(`Found ${usersToUpdate.length} users with invalid timestamps`);

        if (usersToUpdate.length > 0) {
            // Update each user individually to ensure proper validation
            for (const userUpdate of usersToUpdate) {
                await userModel.updateOne(
                    { _id: userUpdate._id },
                    { $set: userUpdate.updateData }
                );
            }

            console.log(`Updated ${usersToUpdate.length} users with proper timestamps`);
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await app.close();
    }
}

migrateUserTimestamps();
