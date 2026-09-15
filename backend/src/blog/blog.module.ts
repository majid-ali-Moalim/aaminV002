import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { AdminBlogController } from './admin-blog.controller';
import { PublicBlogController } from './public-blog.controller';

@Module({
  controllers: [AdminBlogController, PublicBlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
