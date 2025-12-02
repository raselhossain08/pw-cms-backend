import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { Certificate, CertificateSchema } from './entities/additional.entity';
import {
  CertificateTemplate,
  CertificateTemplateSchema,
} from './entities/certificate-template.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Certificate.name, schema: CertificateSchema },
      { name: CertificateTemplate.name, schema: CertificateTemplateSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
