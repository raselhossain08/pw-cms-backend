import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';
import { Refund, RefundSchema } from './entities/refund.entity';
import { Order, OrderSchema } from '../orders/entities/order.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Refund.name, schema: RefundSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
