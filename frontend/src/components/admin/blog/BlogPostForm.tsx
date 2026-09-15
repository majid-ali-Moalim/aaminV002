'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, ImageIcon, Loader2, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadService } from '@/lib/api'
import { blogService, getApiErrorMessage, type BlogPostPayload } from '@/lib/blog/blogApi'
import { BLOG_CATEGORIES, type AdminBlogPost, type BlogPostStatus } from '@/lib/blog/blogConstants'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'
import BlogRichTextEditor from './BlogRichTextEditor'

type Props = {
  mode: 'create' | 'edit'
  postId?: string
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default function BlogPostForm({ mode, postId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0])
  const [status, setStatus] = useState<BlogPostStatus>('DRAFT')
  const [authorName, setAuthorName] = useState('')
  const [publishedAt, setPublishedAt] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)

  useEffect(() => {
    if (mode !== 'edit' || !postId) return
    let cancelled = false
    ;(async () => {
      try {
        const post = await blogService.adminGet(postId)
        if (cancelled) return
        setTitle(post.title)
        setExcerpt(post.excerpt)
        setContent(post.content || '')
        setFeaturedImage(post.featuredImage)
        setCategory(post.category)
        setStatus(post.status)
        setAuthorName(post.authorName || post.author || '')
        setPublishedAt(post.publishedAt ? format(new Date(post.publishedAt), "yyyy-MM-dd'T'HH:mm") : '')
        setIsFeatured(post.isFeatured)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load blog post'))
        router.push('/admin/blog')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, postId, router])

  const validateClient = (nextStatus: BlogPostStatus) => {
    if (!title.trim() || title.trim().length < 5) {
      toast.error('Title must be at least 5 characters')
      return false
    }
    if (!excerpt.trim() || excerpt.trim().length < 20) {
      toast.error('Excerpt must be at least 20 characters')
      return false
    }
    const plainContent = content.replace(/<[^>]+>/g, '').trim()
    if (!plainContent || plainContent.length < 20) {
      toast.error('Content must be at least 20 characters')
      return false
    }
    if (!category) {
      toast.error('Category is required')
      return false
    }
    if (mode === 'create' && !featuredImage.trim()) {
      toast.error('Featured image is required')
      return false
    }
    if (nextStatus === 'PUBLISHED' && !featuredImage.trim()) {
      toast.error('Featured image is required to publish')
      return false
    }
    return true
  }

  const buildPayload = (nextStatus: BlogPostStatus): BlogPostPayload => ({
    title: title.trim(),
    excerpt: excerpt.trim(),
    content,
    featuredImage: featuredImage.trim(),
    category,
    status: nextStatus,
    authorName: authorName.trim() || undefined,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
    isFeatured,
  })

  const savePost = async (nextStatus: BlogPostStatus, redirect?: string) => {
    if (!validateClient(nextStatus)) return
    setSaving(true)
    try {
      const payload = buildPayload(nextStatus)
      let saved: AdminBlogPost
      if (mode === 'create') {
        saved = await blogService.create(payload)
        toast.success(nextStatus === 'PUBLISHED' ? 'Post published' : 'Draft saved')
      } else if (postId) {
        saved = await blogService.update(postId, payload)
        toast.success(nextStatus === 'PUBLISHED' ? 'Post updated and published' : 'Draft saved')
      } else {
        return
      }
      router.push(redirect || '/admin/blog')
      return saved
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save blog post'))
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File | null) => {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or GIF image')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5MB or smaller')
      return
    }
    setUploading(true)
    try {
      const result = await uploadService.uploadFile(file)
      setFeaturedImage(result.url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Image upload failed'))
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/blog"
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'create' ? 'Create Post' : 'Edit Post'}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === 'edit' && postId ? (
            <Button variant="outline" asChild>
              <Link href={`/admin/blog/${postId}/preview`}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => router.push('/admin/blog')} disabled={saving}>
            Cancel
          </Button>
          <Button variant="outline" onClick={() => savePost('DRAFT')} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button onClick={() => savePost('PUBLISHED')} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
              <CardDescription>Write the article title, summary, and body.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title *</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" maxLength={200} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Short Excerpt *</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Brief summary for cards and listings"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Content *</label>
                <BlogRichTextEditor value={content} onChange={setContent} placeholder="Write the full article..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Featured Image *</CardTitle>
              <CardDescription>Recommended 16:9 ratio for blog cards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="aspect-video overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                {featuredImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadedFileUrl(featuredImage)}
                    alt="Featured preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="mb-2 h-8 w-8" />
                    <span className="text-sm">No image selected</span>
                  </div>
                )}
              </div>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => handleImageUpload(e.target.files?.[0] ?? null)}
              />
              {uploading ? (
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                >
                  {BLOG_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BlogPostStatus)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Author (optional)</label>
                <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Display name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Publication Date (optional)</label>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Featured Post</span>
                  <span className="block text-xs text-slate-500">
                    Only one featured post is shown on the public blog. Published posts only.
                  </span>
                </span>
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
