import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({
    example: ['user1', 'user2'],
    description: 'Participant user IDs',
  })
  @IsArray()
  @IsNotEmpty()
  participantIds: string[];

  @ApiProperty({
    example: 'Course Discussion',
    description: 'Conversation title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'course_123',
    description: 'Related course ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiProperty({
    example: false,
    description: 'Group conversation flag',
    required: false,
  })
  @IsOptional()
  isGroup?: boolean;
}
