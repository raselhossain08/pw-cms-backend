import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon } from '../coupons/entities/coupon.entity';

async function fixCouponDates() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const couponModel: Model<Coupon> = app.get(getModelToken(Coupon.name));

    console.log('🔍 Checking for coupons with invalid expiry dates...\n');

    // Find all coupons
    const allCoupons = await couponModel.find({});
    console.log(`Found ${allCoupons.length} total coupons`);

    const fixedCount = 0;
    let removedCount = 0;

    for (const coupon of allCoupons) {
      const hasExpiresAt =
        coupon.expiresAt !== undefined && coupon.expiresAt !== null;

      if (hasExpiresAt) {
        const date = new Date(coupon.expiresAt as Date);

        // Check if the date is invalid
        if (isNaN(date.getTime())) {
          console.log(`❌ Invalid date found in coupon: ${coupon.code}`);
          console.log(`   Current value: ${coupon.expiresAt}`);

          // Remove the invalid expiresAt field
          await couponModel.updateOne(
            { _id: coupon._id },
            { $unset: { expiresAt: '' } },
          );

          console.log(`   ✅ Removed invalid expiresAt field`);
          removedCount++;
        } else {
          console.log(
            `✓ Coupon ${coupon.code}: Valid date - ${date.toISOString()}`,
          );
        }
      } else {
        console.log(`✓ Coupon ${coupon.code}: No expiry date (OK)`);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Total coupons: ${allCoupons.length}`);
    console.log(`   Invalid dates removed: ${removedCount}`);
    console.log(`   Valid dates: ${allCoupons.length - removedCount}`);

    if (removedCount > 0) {
      console.log('\n✅ Successfully fixed all invalid coupon dates!');
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

fixCouponDates()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
