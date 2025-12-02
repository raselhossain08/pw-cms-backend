import { IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Canvas elements configuration' })
  @IsArray()
  @IsNotEmpty()
  elements: any[];

  @ApiProperty({ description: 'Template thumbnail (base64 or URL)' })
  @IsString()
  @IsNotEmpty()
  thumbnail: string;

  @ApiProperty({ description: 'Dynamic field names', required: false })
  @IsArray()
  @IsOptional()
  dynamicFields?: string[];
}

export class UpdateTemplateDto {
  @ApiProperty({ description: 'Template name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Canvas elements configuration',
    required: false,
  })
  @IsArray()
  @IsOptional()
  elements?: any[];

  @ApiProperty({ description: 'Template thumbnail', required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ description: 'Dynamic field names', required: false })
  @IsArray()
  @IsOptional()
  dynamicFields?: string[];

  @ApiProperty({ description: 'Active status', required: false })
  @IsOptional()
  isActive?: boolean;
}
