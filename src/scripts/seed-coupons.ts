import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CouponsService } from '../coupons/coupons.service';
import { CouponType } from '../coupons/entities/coupon.entity';

async function seedCoupons() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const couponsService = app.get(CouponsService);

    console.log('🎫 Starting coupon seeding...\n');

    const coupons = [
        {
            code: 'WELCOME10',
            type: CouponType.PERCENTAGE,
            value: 10,
            isActive: true,
            maxUses: 100,
            minPurchaseAmount: 0,
            expiresAt: new Date('2026-12-31'),
        },
        {
            code: 'SAVE20',
            type: CouponType.PERCENTAGE,
            value: 20,
            isActive: true,
            maxUses: 50,
            minPurchaseAmount: 100,
            expiresAt: new Date('2026-12-31'),
        },
        {
            code: 'AVIATOR25',
            type: CouponType.PERCENTAGE,
            value: 25,
            isActive: true,
            maxUses: 25,
            minPurchaseAmount: 200,
            expiresAt: new Date('2026-12-31'),
        },
        {
            code: 'FLAT50',
            type: CouponType.FIXED,
            value: 50,
            isActive: true,
            maxUses: 75,
            minPurchaseAmount: 150,
            expiresAt: new Date('2026-12-31'),
        },
        {
            code: 'NEWYEAR2026',
            type: CouponType.PERCENTAGE,
            value: 30,
            isActive: true,
            maxUses: 200,
            minPurchaseAmount: 0,
            expiresAt: new Date('2026-01-31'),
        },
    ];

    for (const couponData of coupons) {
        try {
            const existingCoupon = await couponsService['couponModel'].findOne({
                code: couponData.code,
            });

            if (existingCoupon) {
                console.log(`⏭️  Coupon "${couponData.code}" already exists, skipping...`);
                continue;
            }

            await couponsService.create(couponData);
            console.log(`✅ Created coupon: ${couponData.code} (${couponData.value}${couponData.type === CouponType.PERCENTAGE ? '%' : '$'} off)`);
        } catch (error: any) {
            console.error(`❌ Failed to create coupon ${couponData.code}:`, error.message);
        }
    }

    console.log('\n🎉 Coupon seeding completed!');
    await app.close();
}

seedCoupons()
    .then(() => {
        console.log('✨ Seed script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Seed script failed:', error);
        process.exit(1);
    });
