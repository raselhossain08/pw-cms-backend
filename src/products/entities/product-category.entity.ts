import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class ProductCategory extends Document {
  @ApiProperty({ example: 'Electronics', description: 'Category name' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'electronics', description: 'Category slug' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @ApiProperty({
    example: 'Electronic devices and accessories',
    description: 'Category description',
  })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Category image URL',
    required: false,
  })
  @Prop()
  image?: string;

  @ApiProperty({
    example: 'parent-category-id',
    description: 'Parent category ID',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'ProductCategory', default: null })
  parentCategory?: Types.ObjectId | ProductCategory;

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'active',
    description: 'Category status',
  })
  @Prop({
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  })
  status: 'active' | 'inactive';

  @ApiProperty({ example: 0, description: 'Product count' })
  @Prop({ default: 0 })
  productCount: number;

  @ApiProperty({ example: 0, description: 'Subcategory count' })
  @Prop({ default: 0 })
  subcategoryCount: number;

  @ApiProperty({ example: 0, description: 'Display order' })
  @Prop({ default: 0 })
  order: number;

  @ApiProperty({ example: ['tag1', 'tag2'], description: 'Category tags' })
  @Prop([String])
  tags: string[];

  @ApiProperty({ example: 'icon-name', description: 'Category icon' })
  @Prop()
  icon?: string;

  @ApiProperty({ example: '#FF5733', description: 'Category color' })
  @Prop()
  color?: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);

// Indexes for better query performance
ProductCategorySchema.index({ slug: 1 });
ProductCategorySchema.index({ parentCategory: 1 });
ProductCategorySchema.index({ status: 1 });
ProductCategorySchema.index({ name: 'text', description: 'text' });
