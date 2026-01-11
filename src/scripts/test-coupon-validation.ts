import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CouponsService } from '../coupons/coupons.service';

async function testCouponValidation() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const couponsService = app.get(CouponsService);

  console.log('🧪 Testing Coupon Validation...\n');

  const testCases = [
    {
      code: 'WELCOME10',
      amount: 100,
      description: 'Valid coupon with enough amount',
    },
    {
      code: 'SAVE20',
      amount: 50,
      description: 'Valid coupon but below minimum ($100 required)',
    },
    {
      code: 'SAVE20',
      amount: 150,
      description: 'Valid coupon with enough amount',
    },
    { code: 'INVALID', amount: 100, description: 'Invalid coupon code' },
    {
      code: 'welcome10',
      amount: 100,
      description: 'Lowercase code (should work)',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.description}`);
    console.log(
      `   Input: code="${testCase.code}", amount=$${testCase.amount}`,
    );

    try {
      const result = await couponsService.validate(
        testCase.code,
        testCase.amount,
      );

      if (result.valid) {
        console.log(`   ✅ Valid! Discount: $${result.discount.toFixed(2)}`);
        console.log(
          `   Coupon: ${result.coupon?.code} (${result.coupon?.type} - ${result.coupon?.value}${result.coupon?.type === 'percentage' ? '%' : '$'})`,
        );
      } else {
        console.log(`   ❌ Invalid: ${result.message || 'No error message'}`);
      }
    } catch (error: any) {
      console.error(`   💥 Error: ${error.message}`);
    }
  }

  console.log('\n\n🔍 All coupons in database:');
  const allCoupons = await couponsService['couponModel'].find().exec();

  if (allCoupons.length === 0) {
    console.log('   ⚠️  No coupons found! Run: npm run seed:coupons');
  } else {
    allCoupons.forEach((coupon) => {
      console.log(
        `   - ${coupon.code}: ${coupon.value}${coupon.type === 'percentage' ? '%' : '$'} off, min: $${coupon.minPurchaseAmount}, active: ${coupon.isActive}`,
      );
    });
  }

  console.log('\n✨ Test completed!');
  await app.close();
}

testCouponValidation()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
