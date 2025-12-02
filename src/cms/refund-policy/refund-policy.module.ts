import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RefundPolicy,
  RefundPolicySchema,
} from './schemas/refund-policy.schema';
import { RefundPolicyService } from './services/refund-policy.service';
import { RefundPolicyController } from './controllers/refund-policy.controller';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefundPolicy.name, schema: RefundPolicySchema },
    ]),
  ],
  controllers: [RefundPolicyController],
  providers: [RefundPolicyService, CloudinaryService],
  exports: [RefundPolicyService],
})
export class RefundPolicyModule {}
