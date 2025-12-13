import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum SystemEventType {
    SERVER_START = 'server_start',
    SERVER_STOP = 'server_stop',
    DATABASE_CONNECTION = 'database_connection',
    DATABASE_DISCONNECTION = 'database_disconnection',
    BACKUP_CREATED = 'backup_created',
    BACKUP_RESTORED = 'backup_restored',
    CACHE_CLEARED = 'cache_cleared',
    MIGRATION_RUN = 'migration_run',
    SCHEDULED_TASK = 'scheduled_task',
    API_HEALTH_CHECK = 'api_health_check',
    MEMORY_WARNING = 'memory_warning',
    CPU_WARNING = 'cpu_warning',
    DISK_WARNING = 'disk_warning',
}

export enum SystemStatus {
    HEALTHY = 'healthy',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class SystemLog extends Document {
    @Prop({ required: true, enum: SystemEventType, index: true })
    eventType: SystemEventType;

    @Prop({ required: true, enum: SystemStatus, index: true })
    status: SystemStatus;

    @Prop({ required: true })
    message: string;

    @Prop({ type: Object })
    systemMetrics?: {
        cpuUsage?: number;
        memoryUsage?: number;
        diskUsage?: number;
        activeConnections?: number;
        requestsPerMinute?: number;
    };

    @Prop()
    serviceName?: string;

    @Prop()
    serviceVersion?: string;

    @Prop()
    duration?: number; // milliseconds

    @Prop({ type: Object })
    errorDetails?: any;

    @Prop()
    stackTrace?: string;

    @Prop({ default: false })
    requiresAction: boolean;

    @Prop()
    actionTaken?: string;

    @Prop()
    resolvedBy?: string;

    @Prop()
    resolvedAt?: Date;

    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const SystemLogSchema = SchemaFactory.createForClass(SystemLog);

// Indexes
SystemLogSchema.index({ eventType: 1, createdAt: -1 });
SystemLogSchema.index({ status: 1, createdAt: -1 });
SystemLogSchema.index({ requiresAction: 1, status: 1 });
SystemLogSchema.index({ createdAt: -1 });
