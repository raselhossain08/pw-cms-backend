import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TermsConditionsController } from './terms-conditions.controller';
import { TermsConditionsService } from './terms-conditions.service';
import {
  TermsConditions,
  TermsConditionsSchema,
} from './schemas/terms-conditions.schema';
import { CloudinaryService } from '../services/cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TermsConditions.name, schema: TermsConditionsSchema },
    ]),
  ],
  controllers: [TermsConditionsController],
  providers: [TermsConditionsService, CloudinaryService],
  exports: [TermsConditionsService],
})
export class TermsConditionsModule {}
