// src/modules/header/entities/header.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '../../../shared/database/base.entity';
import { TopBar } from './topbar.entity';

@Schema({
    collection: 'headers',
    timestamps: true, // Adds createdAt and updatedAt for SEO/audit
    optimisticConcurrency: true, // Prevents race conditions
})
export class Header extends BaseSchema {
    @Prop({ default: true, index: true }) // Index for fast queries
    enabled: boolean;

    @Prop({ type: Object, required: true })
    logo: {
        dark: string;
        light: string;
        alt: string;
    };

    @Prop({ type: Object })
    cart?: any;

    @Prop({ type: Object })
    search?: any;

    @Prop({ type: Object })
    navigation?: any;

    @Prop({ type: Object })
    userMenu?: any;

    @Prop({ type: Object })
    notifications?: any;

    @Prop({ type: Object })
    theme?: any;

    @Prop({ type: Object })
    announcement?: any;

    @Prop({ type: Object })
    cta?: any;

    @Prop({ type: Object })
    topBar?: TopBar;

    @Prop({ type: Object })
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        keywords?: string[];
        ogImage?: string;
        ogType?: string;
        twitterCard?: string;
        canonicalUrl?: string;
        structuredData?: any;
    };
}

export const HeaderSchema = SchemaFactory.createForClass(Header);

// Add compound index for optimal query performance
HeaderSchema.index({ enabled: 1, updatedAt: -1 });

// Enable lean queries by default for better performance
HeaderSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        return ret;
    }
});

// Add TTL index for cache invalidation (optional)
// HeaderSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });