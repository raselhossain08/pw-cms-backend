import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramLevel, ProgramStatus } from '../entities/training-program.entity';

export class CourseSequenceDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    courseId: string;

    @ApiProperty()
    @IsNumber()
    order: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    prerequisites?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isOptional?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    estimatedDuration?: number;
}

export class CreateProgramDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    thumbnail?: string;

    @ApiProperty({ type: [CourseSequenceDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CourseSequenceDto)
    courseSequence: CourseSequenceDto[];

    @ApiPropertyOptional({ enum: ProgramStatus })
    @IsOptional()
    @IsEnum(ProgramStatus)
    status?: ProgramStatus;

    @ApiPropertyOptional({ enum: ProgramLevel })
    @IsOptional()
    @IsEnum(ProgramLevel)
    level?: ProgramLevel;

    @ApiProperty()
    @IsNumber()
    price: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    originalPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    duration?: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    learningObjectives?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requirements?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    certificateTemplateId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    startDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    endDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isSelfPaced?: boolean;
}

export class UpdateProgramDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    thumbnail?: string;

    @ApiPropertyOptional({ type: [CourseSequenceDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CourseSequenceDto)
    courseSequence?: CourseSequenceDto[];

    @ApiPropertyOptional({ enum: ProgramStatus })
    @IsOptional()
    @IsEnum(ProgramStatus)
    status?: ProgramStatus;

    @ApiPropertyOptional({ enum: ProgramLevel })
    @IsOptional()
    @IsEnum(ProgramLevel)
    level?: ProgramLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    price?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    originalPrice?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    duration?: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    learningObjectives?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requirements?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    certificateTemplateId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    startDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    endDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isSelfPaced?: boolean;
}
