import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  GuestPaymentsController,
} from './payments.controller';
import { Invoice, InvoiceSchema } from './entities/invoice.entity';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { User, UserSchema } from '../users/entities/user.entity';
import { OrdersModule } from '../orders/orders.module';
import { CoursesModule } from '../courses/courses.module';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { ProductsModule } from '../products/products.module';
import { IntegrationsModule } from '../integrations/integrations.module';

import { PaymentMethod, PaymentMethodSchema } from './entities/payment-method.entity';
import { CustomerProfile, CustomerProfileSchema } from './entities/customer-profile.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
      { name: CustomerProfile.name, schema: CustomerProfileSchema },
    ]),
    ConfigModule,
    forwardRef(() => OrdersModule),
    CoursesModule,
    ProductsModule,
    CouponsModule,
    NotificationsModule,
    EnrollmentsModule,
    SystemConfigModule,
    IntegrationsModule,
  ],
  controllers: [PaymentsController, GuestPaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
