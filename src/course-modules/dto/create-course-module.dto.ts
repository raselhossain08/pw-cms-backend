import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
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
  order: number;

  @ApiProperty({ example: 'courseId', description: 'Parent course ID' })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}
