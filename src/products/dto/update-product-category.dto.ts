import { PartialType } from '@nestjs/swagger';
import { CreateProductCategoryDto } from './create-product-category.dto';
import { IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductCategoryDto extends PartialType(
  CreateProductCategoryDto,
) {
  @ApiPropertyOptional({
    example: 'Electronics',
    description: 'Category name',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Electronic devices and accessories',
    description: 'Category description',
    minLength: 10,
    maxLength: 500,
  })
  @IsOptional()
  @MinLength(10)
  @MaxLength(500)
  description?: string;
}
