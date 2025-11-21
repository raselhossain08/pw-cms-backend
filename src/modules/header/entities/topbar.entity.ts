// src/modules/header/entities/topbar.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '../../../shared/database/base.entity';

@Schema({ collection: 'topbars' })
export class TopBar extends BaseSchema {
    @Prop({ default: true })
    enabled: boolean;

    @Prop({ default: 'bg-primary2' })
    backgroundColor: string;

    @Prop({ default: 'text-white' })
    textColor: string;

    @Prop({ type: Object })
    socialStats?: {
        enabled: boolean;
        items: Array<{
            platform: string;
            count: string;
            label: string;
            href: string;
        }>;
    };

    @Prop({ type: Object })
    news?: {
        enabled: boolean;
        badge: string;
        text: string;
        icon?: string;
        link?: string;
    };

    @Prop({ type: Object })
    socialLinks?: {
        enabled: boolean;
        items: Array<{
            platform: string;
            href: string;
        }>;
    };

    @Prop({ type: Object })
    language?: {
        enabled: boolean;
        defaultLanguage: string;
        languages: Array<{
            code: string;
            name: string;
            flag: string;
        }>;
    };

    @Prop({ type: Object })
    currency?: {
        enabled: boolean;
        defaultCurrency: string;
        currencies: Array<{
            code: string;
            name: string;
        }>;
    };

    @Prop({ type: Object })
    mobile?: {
        expandable: boolean;
        showSocialStats: boolean;
        showSocialLinks: boolean;
    };
}

export const TopBarSchema = SchemaFactory.createForClass(TopBar);