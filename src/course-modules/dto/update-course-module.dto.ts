import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateCourseModuleDto } from './create-course-module.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateCourseModuleDto extends PartialType(CreateCourseModuleDto) {
  @ApiProperty({
    example: ['courseId1', 'courseId2'],
    description: 'Array of course IDs this module belongs to',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  courseIds?: string[];
}
