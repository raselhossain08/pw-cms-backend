import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import {
  PaymentsController,
  GuestPaymentsController,
} from './payments.controller';
import { StripeService } from './providers/stripe.service';
import { PayPalService } from './providers/paypal.service';
import { Invoice, InvoiceSchema } from './entities/invoice.entity';
import { Transaction, TransactionSchema } from './entities/transaction.entity';
import { User, UserSchema } from '../users/entities/user.entity';
import { OrdersModule } from '../orders/orders.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ConfigModule,
    forwardRef(() => OrdersModule),
    CoursesModule,
  ],
  controllers: [PaymentsController, GuestPaymentsController],
  providers: [PaymentsService, StripeService, PayPalService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
