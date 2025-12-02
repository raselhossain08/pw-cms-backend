import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import {
  Discussion,
  DiscussionSchema,
  DiscussionReply,
  DiscussionReplySchema,
} from '../certificates/entities/additional.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Discussion.name, schema: DiscussionSchema },
      { name: DiscussionReply.name, schema: DiscussionReplySchema },
    ]),
  ],
  controllers: [DiscussionsController],
  providers: [DiscussionsService],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
