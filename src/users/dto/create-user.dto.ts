import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'john@personalwings.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.STUDENT,
    description: 'User role',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    description: 'User status',
  })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiProperty({
    example: '+1234567890',
    description: 'Phone number',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'US', description: 'Country', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: 'California',
    description: 'State/Province',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 'Los Angeles', description: 'City', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'john-doe',
    description: 'URL-friendly slug for instructor profiles',
    required: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    example: 'Pilot with 10+ years experience',
    description: 'Bio',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.svg',
    description: 'Avatar image URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    example: ['ATP', 'CFI'],
    description: 'Certifications',
    required: false,
  })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiProperty({
    example: 1500,
    description: 'Total flight hours',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  flightHours?: number;
}
