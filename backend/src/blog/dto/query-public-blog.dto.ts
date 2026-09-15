import { IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPublicBlogDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
