import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SocialLinksDto {
  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  twitter?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;

  @IsString()
  @IsOptional()
  website?: string;
}

export class AuthorDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  role: string;

  @IsString()
  @IsOptional()
  avatar: string;

  @IsString()
  @IsOptional()
  bio: string;

  @ValidateNested()
  @Type(() => SocialLinksDto)
  @IsOptional()
  socialLinks?: SocialLinksDto;
}

export class BlogPostDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  excerpt: string;

  @IsString()
  @IsOptional()
  image: string;

  @IsString()
  @IsOptional()
  slug: string;

  @IsBoolean()
  @IsOptional()
  featured: boolean;

  @IsString()
  @IsOptional()
  content: string;

  @ValidateNested()
  @Type(() => AuthorDto)
  @IsOptional()
  author: AuthorDto;

  @IsString()
  @IsOptional()
  publishedAt: string;

  @IsString()
  @IsOptional()
  readTime: string;

  @IsString()
  @IsOptional()
  category: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[];

  @IsNumber()
  @IsOptional()
  views?: number;

  @IsNumber()
  @IsOptional()
  likes?: number;

  @IsNumber()
  @IsOptional()
  commentsCount?: number;
}

export class SeoMetaDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  keywords: string;

  @IsString()
  @IsOptional()
  ogImage?: string;
}

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subtitle: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostDto)
  blogs: BlogPostDto[];

  @ValidateNested()
  @Type(() => SeoMetaDto)
  seo: SeoMetaDto;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBlogDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  blogs?: BlogPostDto[];

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsOptional()
  seo?: SeoMetaDto;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value === 'true';
    }
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
