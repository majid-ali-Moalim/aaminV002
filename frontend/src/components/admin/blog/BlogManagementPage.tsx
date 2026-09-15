'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Edit,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Star,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { blogService, getApiErrorMessage } from '@/lib/blog/blogApi'
import type { AdminBlogPost, BlogPostStatus } from '@/lib/blog/blogConstants'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'
import { cn } from '@/lib/utils'

type Filter = 'ALL' | BlogPostStatus | 'FEATURED'

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={cn('mt-2 text-3xl font-black', accent ?? 'text-slate-900')}>{value}</p>
      </CardContent>
    </Card>
  )
}

export default function BlogManagementPage() {
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<AdminBlogPost[]>([])
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, featured: 0 })
  const [totalPages, setTotalPages] = useState(1)

  const queryParams = useMemo(() => {
    const params: {
      search?: string
      status?: BlogPostStatus
      featured?: 'true' | 'false'
      page?: number
      limit?: number
    } = { page, limit: 20 }
    if (search.trim()) params.search = search.trim()
    if (filter === 'DRAFT' || filter === 'PUBLISHED') params.status = filter
    if (filter === 'FEATURED') params.featured = 'true'
    return params
  }, [filter, page, search])

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await blogService.adminList(queryParams)
      setPosts(data.posts)
      setStats(data.stats)
      setTotalPages(data.totalPages)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load blog posts'))
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
    setActionId(id)
    try {
      await action()
      toast.success(successMessage)
      await loadPosts()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Action failed'))
    } finally {
      setActionId(null)
    }
  }

  const handlePublish = (post: AdminBlogPost) =>
    runAction(post.id, () => blogService.publish(post.id), `"${post.title}" published`)

  const handleUnpublish = (post: AdminBlogPost) => {
    if (!window.confirm(`Unpublish "${post.title}"? It will be removed from the public website.`)) return
    runAction(post.id, () => blogService.unpublish(post.id), `"${post.title}" unpublished`)
  }

  const handleDelete = (post: AdminBlogPost) => {
    if (!window.confirm(`Delete "${post.title}" permanently? This cannot be undone.`)) return
    runAction(post.id, () => blogService.remove(post.id), 'Post deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog Management</h1>
          <p className="text-sm text-slate-500">Create and manage public blog content for the Aamin website.</p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Post
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Posts" value={stats.total} />
        <StatCard label="Published" value={stats.published} accent="text-emerald-600" />
        <StatCard label="Drafts" value={stats.drafts} accent="text-amber-600" />
        <StatCard label="Featured" value={stats.featured} accent="text-red-600" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Search posts..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'PUBLISHED', 'DRAFT', 'FEATURED'] as Filter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setFilter(item)
                    setPage(1)
                  }}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    filter === item
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {item === 'ALL' ? 'All' : item === 'FEATURED' ? 'Featured' : item.charAt(0) + item.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-red-600" />
                    </td>
                  </tr>
                ) : posts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      No blog posts found.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => (
                    <tr key={post.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="h-14 w-20 overflow-hidden rounded-lg bg-slate-100">
                          {post.featuredImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={uploadedFileUrl(post.featuredImage)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[220px]">
                        <div className="line-clamp-2">{post.title}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{post.category}</td>
                      <td className="px-4 py-3 text-slate-600">{post.author}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                            post.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {post.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {post.publishedAt ? format(new Date(post.publishedAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {post.isFeatured ? (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {format(new Date(post.createdAt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {post.status === 'PUBLISHED' ? (
                            <Button variant="ghost" size="icon" asChild title="View">
                              <Link href={`/blog/${post.slug}`} target="_blank">
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" asChild title="Preview">
                              <Link href={`/admin/blog/${post.id}/preview`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/admin/blog/${post.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          {post.status === 'DRAFT' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Publish"
                              disabled={actionId === post.id}
                              onClick={() => handlePublish(post)}
                            >
                              {actionId === post.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UploadCloud className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Unpublish"
                              disabled={actionId === post.id}
                              onClick={() => handleUnpublish(post)}
                            >
                              {actionId === post.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            disabled={actionId === post.id}
                            onClick={() => handleDelete(post)}
                          >
                            {actionId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-600" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
