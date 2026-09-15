import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { QueryAdminBlogDto } from './dto/query-admin-blog.dto';
import { QueryPublicBlogDto } from './dto/query-public-blog.dto';
import { slugifyTitle } from './utils/slug.util';
import { sanitizeBlogContent } from './utils/sanitize-content.util';

const IMAGE_PATH_REGEX = /^(\/uploads\/|https?:\/\/).+\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private mapAdminPost(post: any) {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage,
      category: post.category,
      author: post.authorName || post.author?.username || 'Aamin Ambulance',
      authorName: post.authorName,
      authorId: post.authorId,
      status: post.status,
      isFeatured: post.isFeatured,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private mapPublicPost(post: any, includeContent = false) {
    const base = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      category: post.category,
      author: post.authorName || post.author?.username || 'Aamin Ambulance',
      publishedAt: post.publishedAt,
      isFeatured: post.isFeatured,
    };
    if (includeContent) {
      return { ...base, content: post.content };
    }
    return base;
  }

  private validateFeaturedImage(image: string) {
    if (!image?.trim()) {
      throw new BadRequestException('Featured image is required');
    }
    if (!IMAGE_PATH_REGEX.test(image.trim())) {
      throw new BadRequestException('Featured image must be a valid uploaded image URL');
    }
  }

  private validatePublishableFields(data: {
    title: string;
    excerpt: string;
    content: string;
    featuredImage: string;
    category: string;
  }) {
    if (!data.title?.trim() || data.title.trim().length < 5) {
      throw new BadRequestException('Title must be at least 5 characters to publish');
    }
    if (!data.excerpt?.trim() || data.excerpt.trim().length < 20) {
      throw new BadRequestException('Excerpt must be at least 20 characters to publish');
    }
    if (!data.content?.trim() || data.content.replace(/<[^>]+>/g, '').trim().length < 20) {
      throw new BadRequestException('Content must be at least 20 characters to publish');
    }
    if (!data.category?.trim()) {
      throw new BadRequestException('Category is required to publish');
    }
    this.validateFeaturedImage(data.featuredImage);
  }

  private async ensureUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugifyTitle(title) || 'post';
    let candidate = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.blogPost.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      candidate = `${base}-${counter}`;
      counter += 1;
    }
  }

  private resolvePublishedAt(
    status: BlogPostStatus,
    publishedAt?: string | null,
    existingPublishedAt?: Date | null,
  ): Date | null {
    if (status !== BlogPostStatus.PUBLISHED) return null;
    if (publishedAt) {
      const parsed = new Date(publishedAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid publication date');
      }
      return parsed;
    }
    return existingPublishedAt ?? new Date();
  }

  private async clearOtherFeaturedPosts(
    exceptId: string,
    tx: Pick<PrismaService, 'blogPost'> = this.prisma,
  ) {
    await tx.blogPost.updateMany({
      where: { isFeatured: true, id: { not: exceptId } },
      data: { isFeatured: false },
    });
  }

  async findAllAdmin(query: QueryAdminBlogDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.featured === 'true') where.isFeatured = true;
    if (query.featured === 'false') where.isFeatured = false;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
        { authorName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [posts, total, published, drafts, featured] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: { author: { select: { id: true, username: true, email: true } } },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
      this.prisma.blogPost.count({ where: { status: BlogPostStatus.PUBLISHED } }),
      this.prisma.blogPost.count({ where: { status: BlogPostStatus.DRAFT } }),
      this.prisma.blogPost.count({ where: { isFeatured: true } }),
    ]);

    return {
      stats: {
        total: published + drafts,
        published,
        drafts,
        featured,
      },
      posts: posts.map((p) => this.mapAdminPost(p)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneAdmin(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true, email: true } } },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return this.mapAdminPost(post);
  }

  async create(dto: CreateBlogPostDto, user: { id: string; username?: string }) {
    this.validateFeaturedImage(dto.featuredImage);
    if (dto.status === BlogPostStatus.PUBLISHED) {
      this.validatePublishableFields(dto);
    }

    const slug = await this.ensureUniqueSlug(dto.title);
    const content = sanitizeBlogContent(dto.content);
    const publishedAt = this.resolvePublishedAt(dto.status, dto.publishedAt);

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.blogPost.create({
        data: {
          title: dto.title.trim(),
          slug,
          excerpt: dto.excerpt.trim(),
          content,
          featuredImage: dto.featuredImage.trim(),
          category: dto.category,
          authorName: dto.authorName?.trim() || user.username || 'Aamin Ambulance',
          authorId: user.id,
          status: dto.status,
          isFeatured: dto.isFeatured ?? false,
          publishedAt,
        },
        include: { author: { select: { id: true, username: true, email: true } } },
      });

      if (created.isFeatured && created.status === BlogPostStatus.PUBLISHED) {
        await this.clearOtherFeaturedPosts(created.id, tx);
      } else if (created.isFeatured && created.status !== BlogPostStatus.PUBLISHED) {
        await tx.blogPost.update({ where: { id: created.id }, data: { isFeatured: false } });
        created.isFeatured = false;
      }

      return created;
    });

    return this.mapAdminPost(post);
  }

  async update(id: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog post not found');

    const nextTitle = dto.title?.trim() ?? existing.title;
    const nextExcerpt = dto.excerpt?.trim() ?? existing.excerpt;
    const nextContent = dto.content ? sanitizeBlogContent(dto.content) : existing.content;
    const nextFeaturedImage = dto.featuredImage?.trim() ?? existing.featuredImage;
    const nextCategory = dto.category ?? existing.category;
    const nextStatus = dto.status ?? existing.status;

    if (dto.featuredImage) this.validateFeaturedImage(nextFeaturedImage);

    if (nextStatus === BlogPostStatus.PUBLISHED) {
      this.validatePublishableFields({
        title: nextTitle,
        excerpt: nextExcerpt,
        content: nextContent,
        featuredImage: nextFeaturedImage,
        category: nextCategory,
      });
    }

    const slug =
      dto.title && dto.title.trim() !== existing.title
        ? await this.ensureUniqueSlug(nextTitle, id)
        : existing.slug;

    const publishedAt = this.resolvePublishedAt(
      nextStatus,
      dto.publishedAt === null ? undefined : dto.publishedAt,
      existing.publishedAt,
    );

    let isFeatured = dto.isFeatured ?? existing.isFeatured;
    if (isFeatured && nextStatus !== BlogPostStatus.PUBLISHED) {
      isFeatured = false;
    }

    const post = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.blogPost.update({
        where: { id },
        data: {
          title: nextTitle,
          slug,
          excerpt: nextExcerpt,
          content: nextContent,
          featuredImage: nextFeaturedImage,
          category: nextCategory,
          status: nextStatus,
          authorName: dto.authorName !== undefined ? dto.authorName?.trim() || null : existing.authorName,
          isFeatured,
          publishedAt,
        },
        include: { author: { select: { id: true, username: true, email: true } } },
      });

      if (updated.isFeatured && updated.status === BlogPostStatus.PUBLISHED) {
        await this.clearOtherFeaturedPosts(updated.id, tx);
      }

      return updated;
    });

    return this.mapAdminPost(post);
  }

  async publish(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog post not found');

    this.validatePublishableFields(existing);

    const post = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.blogPost.update({
        where: { id },
        data: {
          status: BlogPostStatus.PUBLISHED,
          publishedAt: existing.publishedAt ?? new Date(),
        },
        include: { author: { select: { id: true, username: true, email: true } } },
      });

      if (updated.isFeatured) {
        await this.clearOtherFeaturedPosts(updated.id, tx);
      }

      return updated;
    });

    return this.mapAdminPost(post);
  }

  async unpublish(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog post not found');

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        status: BlogPostStatus.DRAFT,
        isFeatured: false,
        publishedAt: null,
      },
      include: { author: { select: { id: true, username: true, email: true } } },
    });

    return this.mapAdminPost(post);
  }

  async remove(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Blog post not found');
    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true };
  }

  async findAllPublic(query: QueryPublicBlogDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(24, Math.max(1, query.limit ?? 9));
    const skip = (page - 1) * limit;

    const publishedWhere: Prisma.BlogPostWhereInput = {
      status: BlogPostStatus.PUBLISHED,
    };

    const [featuredPost, posts, total] = await Promise.all([
      this.prisma.blogPost.findFirst({
        where: { ...publishedWhere, isFeatured: true },
        include: { author: { select: { username: true } } },
        orderBy: { publishedAt: 'desc' },
      }),
      this.prisma.blogPost.findMany({
        where: publishedWhere,
        include: { author: { select: { username: true } } },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where: publishedWhere }),
    ]);

    const resolvedFeatured =
      featuredPost ??
      (page === 1
        ? await this.prisma.blogPost.findFirst({
            where: publishedWhere,
            include: { author: { select: { username: true } } },
            orderBy: { publishedAt: 'desc' },
          })
        : null);

    const featuredId = resolvedFeatured?.id;
    const listPosts = posts.filter((p) => p.id !== featuredId || page > 1);

    return {
      featured: resolvedFeatured && page === 1 ? this.mapPublicPost(resolvedFeatured) : null,
      posts: listPosts.map((p) => this.mapPublicPost(p)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findBySlugPublic(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: BlogPostStatus.PUBLISHED },
      include: { author: { select: { username: true } } },
    });
    if (!post) throw new NotFoundException('Blog post not found');

    const related = await this.prisma.blogPost.findMany({
      where: {
        status: BlogPostStatus.PUBLISHED,
        id: { not: post.id },
      },
      include: { author: { select: { username: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });

    return {
      post: this.mapPublicPost(post, true),
      related: related.map((p) => this.mapPublicPost(p)),
    };
  }
}
