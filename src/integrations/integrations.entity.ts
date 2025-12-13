import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum IntegrationStatus {
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    PENDING = 'pending',
}

export enum IntegrationCategory {
    PAYMENT_GATEWAYS = 'Payment Gateways',
    COMMUNICATION = 'Communication',
    MARKETING = 'Marketing',
    ANALYTICS = 'Analytics',
    DEVELOPER_TOOLS = 'Developer Tools',
}

export interface IntegrationStat {
    label: string;
    value: string;
}

@Schema({ timestamps: true })
export class Integration extends Document {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ unique: true, sparse: true })
    slug: string;

    @Prop({
        type: String,
        enum: Object.values(IntegrationCategory),
        default: IntegrationCategory.DEVELOPER_TOOLS,
    })
    category: IntegrationCategory;

    @Prop({ required: true })
    description: string;

    @Prop({
        type: String,
        enum: Object.values(IntegrationStatus),
        default: IntegrationStatus.DISCONNECTED,
    })
    status: IntegrationStatus;

    @Prop()
    logo: string;

    @Prop({ type: Object, default: {} })
    config: Record<string, any>;

    @Prop({ type: Array, default: [] })
    stats: IntegrationStat[];

    @Prop({ type: Object, default: {} })
    credentials: Record<string, any>;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: 0 })
    sortOrder: number;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);