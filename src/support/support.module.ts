import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import {
  Ticket,
  TicketSchema,
  TicketReply,
  TicketReplySchema,
} from './entities/ticket.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: TicketReply.name, schema: TicketReplySchema },
    ]),
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
