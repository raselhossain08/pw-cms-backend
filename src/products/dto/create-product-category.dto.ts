import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
  MaxLength,
  IsUrl,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({
    example: 'Electronics',
    description: 'Category name',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Electronic devices and accessories',
    description: 'Category description',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({
    example: 'https://example.com/image.jpg',
    description: 'Category image URL',
  })
  @IsString()
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    example: 'parent-category-id',
    description: 'Parent category ID',
  })
  @IsMongoId()
  @IsOptional()
  parentCategory?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive'],
    example: 'active',
    description: 'Category status',
    default: 'active',
  })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({
    example: ['electronics', 'devices'],
    description: 'Category tags',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    example: 'icon-name',
    description: 'Category icon',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    example: '#FF5733',
    description: 'Category color',
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display order',
    default: 0,
  })
  @IsOptional()
  order?: number;
}
