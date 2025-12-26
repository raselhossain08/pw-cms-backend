import {
    IsString,
    IsArray,
    IsEnum,
    IsOptional,
    ArrayMinSize,
    ArrayMaxSize,
    MinLength,
} from 'class-validator';

export enum InstructorStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    SUSPENDED = 'suspended',
}

export enum ExportFormat {
    CSV = 'csv',
    JSON = 'json',
}

// Bulk Delete DTOfrontend
export class BulkDeleteInstructorsDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one instructor ID is required' })
    @ArrayMaxSize(100, { message: 'Cannot delete more than 100 instructors at once' })
    @IsString({ each: true })
    ids: string[];
}

// Bulk Update Status DTO
export class BulkUpdateStatusDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one instructor ID is required' })
    @ArrayMaxSize(100, { message: 'Cannot update more than 100 instructors at once' })
    @IsString({ each: true })
    ids: string[];

    @IsEnum(InstructorStatus)
    status: InstructorStatus;
}

// Reject Instructor DTO
export class RejectInstructorDto {
    @IsString()
    @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
    reason: string;
}

// Export Instructors DTO
export class ExportInstructorsDto {
    @IsOptional()
    @IsEnum(ExportFormat)
    format?: ExportFormat = ExportFormat.CSV;

    @IsOptional()
    @IsEnum(InstructorStatus)
    status?: InstructorStatus;

    @IsOptional()
    @IsString()
    specialization?: string;

    @IsOptional()
    @IsString()
    experience?: string;

    @IsOptional()
    @IsString()
    search?: string;
}
