'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { blogService, getApiErrorMessage } from '@/lib/blog/blogApi'
import type { AdminBlogPost } from '@/lib/blog/blogConstants'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'

export default function BlogPreviewPage({ postId }: { postId: string }) {
  const [post, setPost] = useState<AdminBlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await blogService.adminGet(postId)
        if (!cancelled) setPost(data)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to load preview'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [postId])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  if (!post) return null

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Admin preview — this {post.status === 'DRAFT' ? 'draft' : 'post'} is only visible here until published.
      </div>
      <Link
        href={`/admin/blog/${postId}/edit`}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to edit
      </Link>

      <article className={`${PUBLIC_HEADER_OFFSET} pb-16`}>
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">{post.category}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">{post.title}</h1>
            <p className="mt-4 text-slate-500">
              {post.publishedAt
                ? format(new Date(post.publishedAt), 'MMMM d, yyyy')
                : 'Not published yet'}
              {post.author ? ` · ${post.author}` : ''}
            </p>
          </div>
          <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="aspect-[21/9] overflow-hidden rounded-3xl bg-slate-100">
              {post.featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadedFileUrl(post.featuredImage)}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
            <div
              className="blog-article text-base md:text-lg"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </section>
      </article>
    </div>
  )
}
