import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { BlogService } from './blog.service';
import { QueryPublicBlogDto } from './dto/query-public-blog.dto';

@ApiTags('blog')
@Controller('blog')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published blog posts (public)' })
  findAll(@Query() query: QueryPublicBlogDto) {
    return this.blogService.findAllPublic(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a published blog post by slug (public)' })
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlugPublic(slug);
  }
}
