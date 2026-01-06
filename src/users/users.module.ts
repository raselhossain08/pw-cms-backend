import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserDashboardController } from './user-dashboard.controller';
import { User, UserSchema } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import {
  Enrollment,
  EnrollmentSchema,
} from '../enrollments/entities/enrollment.entity';
import {
  Certificate,
  CertificateSchema,
} from '../certificates/entities/additional.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Enrollment.name, schema: EnrollmentSchema },
      { name: Certificate.name, schema: CertificateSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, UserDashboardController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
