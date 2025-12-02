import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import {
  Campaign,
  CampaignSchema,
  CampaignEvent,
  CampaignEventSchema,
} from './entities/campaign.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignEvent.name, schema: CampaignEventSchema },
    ]),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
