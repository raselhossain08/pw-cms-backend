import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { FileType } from '../entities/file.entity';

export class UploadFileDto {
  @ApiProperty({
    enum: FileType,
    example: FileType.IMAGE,
    description: 'File type',
  })
  @IsEnum(FileType)
  @IsOptional()
  type?: FileType;

  @ApiProperty({
    example: 'Course thumbnail',
    description: 'File description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['thumbnail', 'course'],
    description: 'File tags',
    required: false,
  })
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: 'course_123',
    description: 'Associated entity ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  associatedEntity?: string;

  @ApiProperty({
    example: 'course',
    description: 'Associated entity type',
    required: false,
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiProperty({
    example: 'public',
    description: 'File visibility',
    required: false,
  })
  @IsString()
  @IsOptional()
  visibility?: string;
}
