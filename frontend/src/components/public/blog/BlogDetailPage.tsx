'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, CalendarDays, Loader2, User } from 'lucide-react'
import { blogService, getApiErrorMessage } from '@/lib/blog/blogApi'
import type { PublicBlogPost } from '@/lib/blog/blogConstants'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'
import BlogCard from './BlogCard'

export default function BlogDetailPage({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [post, setPost] = useState<PublicBlogPost | null>(null)
  const [related, setRelated] = useState<PublicBlogPost[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await blogService.publicGetBySlug(slug)
        if (cancelled) return
        setPost(data.post)
        setRelated(data.related)
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Blog post not found'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className={`${PUBLIC_HEADER_OFFSET} flex min-h-[50vh] items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className={`${PUBLIC_HEADER_OFFSET} mx-auto max-w-3xl px-4 py-20 text-center`}>
        <h1 className="text-2xl font-bold text-slate-900">Post not found</h1>
        <p className="mt-2 text-slate-600">{error || 'This article may have been unpublished or removed.'}</p>
        <Link href="/blog" className="mt-6 inline-flex items-center gap-2 text-red-600 font-semibold hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>
    )
  }

  return (
    <article className={`${PUBLIC_HEADER_OFFSET} bg-white pb-16`}>
      {/* Immersive header */}
      <header className="relative bg-slate-900">
        <div className="absolute inset-0">
          {post.featuredImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadedFileUrl(post.featuredImage)}
              alt={post.title}
              className="h-full w-full object-cover opacity-40"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/40" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-14">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          <span className="mt-8 inline-flex rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {post.category}
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-black leading-tight tracking-tight text-white">
            {post.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-200">
            {post.author ? (
              <span className="inline-flex items-center gap-2">
                <User className="h-4 w-4" />
                {post.author}
              </span>
            ) : null}
            {post.publishedAt ? (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Feature image card overlapping header */}
      <div className="mx-auto -mt-8 max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="aspect-[21/9] overflow-hidden rounded-3xl bg-slate-100 shadow-xl">
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

      {/* Body */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
        <p className="mb-8 border-l-4 border-red-600 pl-4 text-xl font-medium leading-relaxed text-slate-700">
          {post.excerpt}
        </p>
        <div
          className="blog-article text-base md:text-lg"
          dangerouslySetInnerHTML={{ __html: post.content || '' }}
        />

        <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to all stories
          </Link>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="border-t border-slate-100 bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center gap-4">
              <h2 className="text-xl font-black uppercase tracking-wide text-slate-900">More Stories</h2>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <BlogCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  )
}
