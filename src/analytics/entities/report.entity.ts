import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportStatus } from '../dto/create-report.dto';

@Schema({ timestamps: true })
export class Report extends Document {
    @ApiProperty({ description: 'Report name' })
    @Prop({ required: true })
    name: string;

    @ApiProperty({ description: 'Report description' })
    @Prop()
    description?: string;

    @ApiProperty({ description: 'Report type', enum: ReportType })
    @Prop({ required: true, enum: Object.values(ReportType) })
    type: ReportType;

    @ApiProperty({ description: 'Report period' })
    @Prop({ required: true })
    period: string;

    @ApiProperty({ description: 'Report status', enum: ReportStatus })
    @Prop({
        required: true,
        enum: Object.values(ReportStatus),
        default: ReportStatus.DRAFT,
    })
    status: ReportStatus;

    @ApiProperty({ description: 'Report configuration' })
    @Prop({ type: MongooseSchema.Types.Mixed })
    config?: {
        metrics?: string[];
        filters?: Record<string, any>;
        chartConfig?: Record<string, any>;
    };

    @ApiProperty({ description: 'Report data' })
    @Prop({ type: MongooseSchema.Types.Mixed })
    data?: Record<string, any>;

    @ApiProperty({ description: 'Report creator user ID' })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: MongooseSchema.Types.ObjectId;

    @ApiProperty({ description: 'Last updated by user ID' })
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
    updatedBy?: MongooseSchema.Types.ObjectId;

    @ApiProperty({ description: 'Auto-generate report' })
    @Prop({ default: false })
    autoGenerate: boolean;

    @ApiProperty({ description: 'Schedule date' })
    @Prop()
    scheduledAt?: Date;

    @ApiProperty({ description: 'Generation date' })
    @Prop()
    generatedAt?: Date;

    @ApiProperty({ description: 'Report file URL' })
    @Prop()
    fileUrl?: string;

    @ApiProperty({ description: 'File format' })
    @Prop({ enum: ['pdf', 'csv', 'xlsx', 'json'] })
    fileFormat?: string;

    @ApiProperty({ description: 'Error message if generation failed' })
    @Prop()
    errorMessage?: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Update timestamp' })
    updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
