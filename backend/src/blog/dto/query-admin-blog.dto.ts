import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BlogPostStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class QueryAdminBlogDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional()
  @IsString()
  featured?: 'true' | 'false';

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
