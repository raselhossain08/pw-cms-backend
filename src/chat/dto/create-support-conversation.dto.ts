import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateSupportConversationDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'User name for support conversation',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email for support conversation',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'technical',
    description: 'Support category',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  category?: string;

  @ApiProperty({
    example: 'course123',
    description: 'Course ID if related to a specific course',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Course ID must be a string' })
  courseId?: string;

  @ApiProperty({
    example: 'I need help with my account',
    description: 'Initial message for the support conversation',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  message?: string;
}
