import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TopBarDocument = TopBar & Document;

@Schema()
class SocialStat {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  href: string;

  @Prop({ required: true })
  count: string;

  @Prop()
  label?: string;
}

@Schema()
class Language {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  flag: string;
}

@Schema()
class Currency {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;
}

@Schema()
class NewsAnnouncement {
  @Prop({ required: true })
  badge: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  icon: string;
}

@Schema()
class SocialLink {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  href: string;
}

@Schema({ timestamps: true })
export class TopBar {
  @Prop({ type: [SocialStat], default: [] })
  socialStats: SocialStat[];

  @Prop({ type: [Language], required: true })
  languages: Language[];

  @Prop({ type: [Currency], required: true })
  currencies: Currency[];

  @Prop({ type: NewsAnnouncement, required: true })
  news: NewsAnnouncement;

  @Prop({ type: [SocialLink], required: true })
  socialLinks: SocialLink[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TopBarSchema = SchemaFactory.createForClass(TopBar);

TopBarSchema.set('toJSON', {
  transform: function (_doc: any, ret: any) {
    if (ret._id) ret._id = ret._id.toString();
    return ret;
  },
});

TopBarSchema.index({ isActive: 1 });
