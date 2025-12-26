import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Certificate } from '../certificates/entities/additional.entity';

async function fixCertificateDates() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const certificateModel = app.get<Model<Certificate>>('CertificateModel');

    // Find all certificates without issuedAt
    const certificates = await certificateModel.find({
      $or: [{ issuedAt: null }, { issuedAt: { $exists: false } }],
    });

    console.log(`Found ${certificates.length} certificates without issuedAt`);

    let updated = 0;
    for (const cert of certificates) {
      // Use createdAt as issuedAt, or current date if createdAt doesn't exist
      const issuedAt = (cert as any).createdAt || new Date();

      await certificateModel.updateOne(
        { _id: cert._id },
        { $set: { issuedAt } },
      );

      updated++;
      console.log(
        `Updated certificate ${cert.certificateId} with issuedAt: ${issuedAt}`,
      );
    }

    console.log(`\nSuccessfully updated ${updated} certificates`);
  } catch (error) {
    console.error('Error fixing certificate dates:', error);
  } finally {
    await app.close();
  }
}

fixCertificateDates();
