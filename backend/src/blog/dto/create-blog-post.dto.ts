import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BlogPostStatus } from '@prisma/client';
import { BLOG_CATEGORIES } from '../blog.constants';

export class CreateBlogPostDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(500)
  excerpt: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;

  @IsString()
  @IsNotEmpty()
  featuredImage: string;

  @IsString()
  @IsIn([...BLOG_CATEGORIES])
  category: string;

  @IsEnum(BlogPostStatus)
  status: BlogPostStatus;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
