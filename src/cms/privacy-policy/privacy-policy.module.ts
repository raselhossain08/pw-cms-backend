import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PrivacyPolicy,
  PrivacyPolicySchema,
} from './schemas/privacy-policy.schema';
import { PrivacyPolicyService } from './services/privacy-policy.service';
import { PrivacyPolicyController } from './controllers/privacy-policy.controller';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrivacyPolicy.name, schema: PrivacyPolicySchema },
    ]),
  ],
  controllers: [PrivacyPolicyController],
  providers: [PrivacyPolicyService, CloudinaryService],
  exports: [PrivacyPolicyService],
})
export class PrivacyPolicyModule {}
