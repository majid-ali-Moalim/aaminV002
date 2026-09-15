import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';

@ApiTags('admin-blog')
@Controller('admin/blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List all blog posts (admin)' })
  findAll(@Query() query: QueryAdminBlogDto) {
    return this.blogService.findAllAdmin(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a blog post by ID (admin)' })
  findOne(@Param('id') id: string) {
    return this.blogService.findOneAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a blog post' })
  create(@Body() dto: CreateBlogPostDto, @CurrentUser() user: any) {
    return this.blogService.create(dto, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a blog post' })
  update(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a blog post' })
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish a blog post' })
  publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish a blog post' })
  unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }
}
