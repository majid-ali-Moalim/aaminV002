import { ApiService, getApiErrorMessage } from '@/lib/api'
import type {
  AdminBlogListResponse,
  AdminBlogPost,
  BlogPostStatus,
  PublicBlogListResponse,
  PublicBlogPost,
} from './blogConstants'

export { getApiErrorMessage }

export type BlogPostPayload = {
  title: string
  excerpt: string
  content: string
  featuredImage: string
  category: string
  status: BlogPostStatus
  authorName?: string
  publishedAt?: string | null
  isFeatured?: boolean
}

export const blogService = {
  adminList: async (params?: {
    search?: string
    status?: BlogPostStatus
    featured?: 'true' | 'false'
    page?: number
    limit?: number
  }) => {
    const api = new ApiService()
    return await api.get<AdminBlogListResponse>('/api/admin/blog', { params })
  },

  adminGet: async (id: string) => {
    const api = new ApiService()
    return await api.get<AdminBlogPost>(`/api/admin/blog/${id}`)
  },

  create: async (data: BlogPostPayload) => {
    const api = new ApiService()
    return await api.post<AdminBlogPost>('/api/admin/blog', data)
  },

  update: async (id: string, data: Partial<BlogPostPayload>) => {
    const api = new ApiService()
    return await api.put<AdminBlogPost>(`/api/admin/blog/${id}`, data)
  },

  publish: async (id: string) => {
    const api = new ApiService()
    return await api.patch<AdminBlogPost>(`/api/admin/blog/${id}/publish`)
  },

  unpublish: async (id: string) => {
    const api = new ApiService()
    return await api.patch<AdminBlogPost>(`/api/admin/blog/${id}/unpublish`)
  },

  remove: async (id: string) => {
    const api = new ApiService()
    return await api.delete<{ success: boolean }>(`/api/admin/blog/${id}`)
  },

  publicList: async (params?: { page?: number; limit?: number }) => {
    const api = new ApiService()
    return await api.get<PublicBlogListResponse>('/api/blog', { params })
  },

  publicGetBySlug: async (slug: string) => {
    const api = new ApiService()
    return await api.get<{ post: PublicBlogPost; related: PublicBlogPost[] }>(`/api/blog/${slug}`)
  },
}
