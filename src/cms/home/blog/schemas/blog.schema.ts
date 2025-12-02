import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Author {
  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  role: string;

  @Prop({ default: '' })
  avatar: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ type: Object, default: {} })
  socialLinks: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

export const AuthorSchema = SchemaFactory.createForClass(Author);

@Schema({ _id: false })
export class BlogPost {
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  excerpt: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  slug: string;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ default: '' })
  content: string;

  @Prop({ type: AuthorSchema, default: {} })
  author: Author;

  @Prop({ default: Date.now })
  publishedAt: Date;

  @Prop({ default: '5 min read' })
  readTime: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  commentsCount: number;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);

@Schema({ _id: false })
export class SeoMeta {
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  keywords: string;

  @Prop({ default: '' })
  ogImage: string;
}

export const SeoMetaSchema = SchemaFactory.createForClass(SeoMeta);

@Schema({ timestamps: true })
export class Blog extends Document {
  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  subtitle: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: [BlogPostSchema], default: [] })
  blogs: BlogPost[];

  @Prop({
    type: SeoMetaSchema,
    default: { title: '', description: '', keywords: '', ogImage: '' },
  })
  seo: SeoMeta;

  @Prop({ default: true })
  isActive: boolean;
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
export type BlogDocument = Blog & Document;
