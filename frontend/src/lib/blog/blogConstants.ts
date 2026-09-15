export const BLOG_CATEGORIES = [
  'Ambulance Services',
  'Emergency Medical Services',
  'First Aid Training',
  'Public Safety',
  'Emergency Management',
  'Community Awareness',
  'Aamin News',
  'General',
] as const

export type BlogCategory = (typeof BLOG_CATEGORIES)[number]

export type BlogPostStatus = 'DRAFT' | 'PUBLISHED'

export type PublicBlogPost = {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImage: string
  category: string
  author: string
  publishedAt: string | null
  isFeatured: boolean
  content?: string
}

export type AdminBlogPost = PublicBlogPost & {
  content: string
  authorName?: string | null
  authorId?: string | null
  status: BlogPostStatus
  createdAt: string
  updatedAt: string
}

export type AdminBlogListResponse = {
  stats: {
    total: number
    published: number
    drafts: number
    featured: number
  }
  posts: AdminBlogPost[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type PublicBlogListResponse = {
  featured: PublicBlogPost | null
  posts: PublicBlogPost[]
  page: number
  limit: number
  total: number
  totalPages: number
}
