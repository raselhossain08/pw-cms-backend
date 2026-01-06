import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  IsEnum,
} from 'class-validator';

export class CreateCourseModuleDto {
  @ApiProperty({ example: 'Introduction', description: 'Module title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Basics of the course',
    description: 'Module description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '60', description: 'Module duration in minutes' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: 1, description: 'Display order within course' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  order?: number;

  @ApiProperty({ example: 'courseId', description: 'Primary course ID' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    example: ['courseId1', 'courseId2'],
    description:
      'Array of course IDs this module belongs to (supports multiple courses)',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  courseIds?: string[];

  @ApiProperty({
    example: 'published',
    description: 'Module status',
    enum: ['draft', 'published'],
    required: false,
  })
  @IsEnum(['draft', 'published'])
  @IsOptional()
  status?: string;
}
