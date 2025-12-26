import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WishlistService } from '../wishlist/wishlist.service';
import { UsersService } from '../users/users.service';
import { CoursesService } from '../courses/courses.service';
import { CouponsService } from '../coupons/coupons.service';
import { Coupon, CouponType } from '../coupons/entities/coupon.entity';
import { Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

async function testCartCoupon() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const wishlistService = app.get(WishlistService);
  const usersService = app.get(UsersService);
  const coursesService = app.get(CoursesService);
  const couponsService = app.get(CouponsService);
  const couponModel = app.get<Model<Coupon>>(getModelToken(Coupon.name));
  const logger = new Logger('TestCartCoupon');

  console.log('🛒 Testing Cart Coupon Application Scenarios...\n');

  try {
    // 1. Get a user
    const user = await usersService.findByEmail('admin@personalwings.com');
    if (!user) {
      throw new Error('Admin user not found. Run seed:database first.');
    }
    const userId = (user as any)._id.toString();
    console.log(`👤 Using user: ${user.email} (${userId})`);

    // 2. Setup Test Coupons
    console.log('\n📝 Setting up test coupons...');

    // Clean up old test coupons directly via model
    const testCodes = [
      'TEST_MIN_200',
      'TEST_EXPIRED',
      'TEST_MAX_USES',
      'TEST_VALID_10',
    ];
    await couponModel.deleteMany({ code: { $in: testCodes } });
    console.log('   Cleaned up old test coupons');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // A. Min Purchase Coupon (Service is fine)
    await couponsService.create({
      code: 'TEST_MIN_200',
      type: CouponType.FIXED,
      value: 50,
      minPurchaseAmount: 200,
      isActive: true,
      expiresAt: tomorrow,
    });

    // B. Expired Coupon (Use Model to bypass validation)
    await couponModel.create({
      code: 'TEST_EXPIRED',
      type: CouponType.FIXED,
      value: 20,
      isActive: true,
      expiresAt: yesterday, // Past date
      usedCount: 0,
      maxUses: 0,
      minPurchaseAmount: 0,
    });

    // C. Max Uses Coupon (Service is fine)
    await couponsService.create({
      code: 'TEST_MAX_USES',
      type: CouponType.FIXED,
      value: 10,
      maxUses: 1,
      isActive: true,
      expiresAt: tomorrow,
    });

    // D. Valid 10% Coupon (Service is fine)
    await couponsService.create({
      code: 'TEST_VALID_10',
      type: CouponType.PERCENTAGE,
      value: 10, // 10%
      isActive: true,
      expiresAt: tomorrow,
    });

    console.log('   Coupons created successfully');

    // 3. Get a course and Add to Cart (Price $100)
    const courses = await coursesService.findAll();
    if (courses.courses.length === 0) throw new Error('No courses found');
    const course = courses.courses[0];

    // Force price to be $100 for this test logic by passing it explicitly to addToCart
    const TEST_PRICE = 100;
    console.log(`\n📚 Adding course to cart with forced price: $${TEST_PRICE}`);

    // Clear Cart
    await wishlistService.clearCart(userId);

    // Add item
    await wishlistService.addToCart(
      userId,
      (course as any)._id.toString(),
      'Course',
      TEST_PRICE,
    );

    // Verify Cart Total
    let cart = await wishlistService.getCart(userId);
    console.log(
      `   Cart Subtotal: $${cart?.items[0].price} * ${cart?.items[0].quantity} = $${cart?.totalAmount}`,
    );

    // 4. Test Scenarios

    // Scenario 1: Min Purchase Requirement
    console.log(
      '\n🧪 Test 1: Min Purchase ($200 required, have $100) (EXPECT FAILURE)',
    );
    try {
      await wishlistService.applyCoupon(userId, 'TEST_MIN_200');
      console.log('❌ Failed: Should have thrown error for min purchase');
    } catch (error: any) {
      if (error.message.includes('Minimum purchase')) {
        console.log(`✅ Success: Caught expected error: ${error.message}`);
      } else {
        console.log(`❌ Failed: Caught unexpected error: ${error.message}`);
      }
    }

    // Scenario 2: Expired Coupon
    console.log('\n🧪 Test 2: Expired Coupon (EXPECT FAILURE)');
    try {
      await wishlistService.applyCoupon(userId, 'TEST_EXPIRED');
      console.log('❌ Failed: Should have thrown error for expired coupon');
    } catch (error: any) {
      if (error.message.includes('expired')) {
        console.log(`✅ Success: Caught expected error: ${error.message}`);
      } else {
        console.log(`❌ Failed: Caught unexpected error: ${error.message}`);
      }
    }

    // Scenario 3: Valid 10% Coupon
    console.log('\n🧪 Test 3: Valid 10% Coupon (EXPECT SUCCESS)');
    cart = await wishlistService.applyCoupon(userId, 'TEST_VALID_10');
    if (cart.discount === 10) {
      // 10% of 100 is 10
      console.log(
        `✅ Success: Applied 10% off. Discount: $${cart.discount}, Total: $${cart.totalAmount}`,
      );
    } else {
      console.log(`❌ Failed: Expected $10 discount, got $${cart.discount}`);
    }

    // Scenario 4: Max Usage Limit
    console.log('\n🧪 Test 4: Max Usage Limit (Simulated)');
    // Manually increment usage to max
    const maxCoupon = await couponModel.findOne({ code: 'TEST_MAX_USES' });
    if (maxCoupon) {
      // Simulate usage by incrementing usedCount
      maxCoupon.usedCount = 1;
      await maxCoupon.save();
      console.log('   Simulated coupon usage (1/1)');

      try {
        await wishlistService.applyCoupon(userId, 'TEST_MAX_USES');
        console.log('❌ Failed: Should have thrown error for usage limit');
      } catch (error: any) {
        if (error.message.includes('usage limit')) {
          console.log(`✅ Success: Caught expected error: ${error.message}`);
        } else {
          console.log(`❌ Failed: Caught unexpected error: ${error.message}`);
        }
      }
    } else {
      console.log('❌ Failed: Could not find TEST_MAX_USES coupon');
    }
  } catch (error: any) {
    console.error('💥 Test failed:', error.message);
  }

  console.log('\n✨ All Tests Completed!');
  await app.close();
}

testCartCoupon()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
