import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon } from '../coupons/entities/coupon.entity';

async function fixInvalidDates() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const couponModel: Model<Coupon> = app.get(getModelToken(Coupon.name));

    console.log('🔍 Checking for coupons with invalid date fields...\n');

    // Find all coupons
    const allCoupons = await couponModel.find({}).lean();
    console.log(`Found ${allCoupons.length} total coupons`);

    let fixedCount = 0;

    for (const coupon of allCoupons) {
      const updates: any = {};
      let needsUpdate = false;
      const couponAny = coupon as any; // Type assertion for lean documents

      // Check expiresAt
      if (couponAny.expiresAt !== null && couponAny.expiresAt !== undefined) {
        if (
          typeof couponAny.expiresAt === 'object' &&
          Object.keys(couponAny.expiresAt).length === 0
        ) {
          // It's an empty object - remove it
          updates.$unset = updates.$unset || {};
          updates.$unset.expiresAt = '';
          needsUpdate = true;
          console.log(
            `❌ Coupon ${couponAny.code}: Has empty object in expiresAt`,
          );
        } else if (couponAny.expiresAt instanceof Date) {
          if (isNaN(couponAny.expiresAt.getTime())) {
            // It's an invalid date
            updates.$unset = updates.$unset || {};
            updates.$unset.expiresAt = '';
            needsUpdate = true;
            console.log(
              `❌ Coupon ${couponAny.code}: Has invalid date in expiresAt`,
            );
          } else {
            console.log(
              `✓ Coupon ${couponAny.code}: Valid expiresAt - ${couponAny.expiresAt.toISOString()}`,
            );
          }
        } else if (typeof couponAny.expiresAt === 'string') {
          // Try to parse it
          const date = new Date(couponAny.expiresAt);
          if (isNaN(date.getTime())) {
            updates.$unset = updates.$unset || {};
            updates.$unset.expiresAt = '';
            needsUpdate = true;
            console.log(
              `❌ Coupon ${couponAny.code}: Has invalid date string in expiresAt`,
            );
          } else {
            console.log(
              `✓ Coupon ${couponAny.code}: Valid expiresAt - ${date.toISOString()}`,
            );
          }
        }
      } else {
        console.log(`✓ Coupon ${couponAny.code}: No expiresAt (OK)`);
      }

      // Check createdAt
      if (
        couponAny.createdAt &&
        typeof couponAny.createdAt === 'object' &&
        Object.keys(couponAny.createdAt).length === 0
      ) {
        updates.$unset = updates.$unset || {};
        updates.$unset.createdAt = '';
        needsUpdate = true;
        console.log(`  ⚠️  Has empty object in createdAt`);
      }

      // Check updatedAt
      if (
        couponAny.updatedAt &&
        typeof couponAny.updatedAt === 'object' &&
        Object.keys(couponAny.updatedAt).length === 0
      ) {
        updates.$unset = updates.$unset || {};
        updates.$unset.updatedAt = '';
        needsUpdate = true;
        console.log(`  ⚠️  Has empty object in updatedAt`);
      }

      if (needsUpdate) {
        // Use $unset to remove invalid fields, but disable timestamps auto-update
        await couponModel.updateOne(
          { _id: couponAny._id },
          updates,
          { timestamps: false }, // Disable automatic timestamp updates
        );
        console.log(`  ✅ Fixed coupon ${couponAny.code}`);
        fixedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total coupons: ${allCoupons.length}`);
    console.log(`   Coupons fixed: ${fixedCount}`);

    if (fixedCount > 0) {
      console.log('\n✅ Successfully fixed all invalid date fields!');
    } else {
      console.log('\n✅ No invalid dates found. All coupons are clean!');
    }
  } catch (error) {
    console.error('❌ Error fixing coupon dates:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

fixInvalidDates()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
