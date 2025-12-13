import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class ErrorLog extends Document {
    @Prop({ required: true, enum: ErrorSeverity, index: true })
    severity: ErrorSeverity;

    @Prop({ required: true })
    errorType: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: Object })
    stack?: any;

    @Prop()
    endpoint?: string;

    @Prop()
    method?: string;

    @Prop()
    statusCode?: number;

    @Prop()
    userId?: string;

    @Prop()
    ipAddress?: string;

    @Prop()
    userAgent?: string;

    @Prop({ type: Object })
    requestBody?: any;

    @Prop({ type: Object })
    queryParams?: any;

    @Prop()
    errorCode?: string;

    @Prop({ default: false, index: true })
    isResolved: boolean;

    @Prop()
    resolvedBy?: string;

    @Prop()
    resolvedAt?: Date;

    @Prop()
    solution?: string;

    @Prop({ default: 1 })
    occurrences: number;

    @Prop()
    lastOccurrence?: Date;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog);

// Indexes
ErrorLogSchema.index({ severity: 1, isResolved: 1, createdAt: -1 });
ErrorLogSchema.index({ errorType: 1, createdAt: -1 });
ErrorLogSchema.index({ createdAt: -1 });
