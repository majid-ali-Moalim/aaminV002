'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, CalendarDays, Loader2 } from 'lucide-react'
import { blogService, getApiErrorMessage } from '@/lib/blog/blogApi'
import type { PublicBlogPost } from '@/lib/blog/blogConstants'
import { PUBLIC_HEADER_OFFSET } from '@/lib/layout/publicHeader'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'
import BlogCard from './BlogCard'

export default function BlogListingPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featured, setFeatured] = useState<PublicBlogPost | null>(null)
  const [posts, setPosts] = useState<PublicBlogPost[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await blogService.publicList({ page: 1, limit: 9 })
        if (cancelled) return
        setFeatured(data.featured)
        setPosts(data.posts)
        setPage(1)
        setTotalPages(data.totalPages)
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, 'Failed to load blog posts'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = async () => {
    if (page >= totalPages || loadingMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const data = await blogService.publicList({ page: nextPage, limit: 9 })
      setPosts((prev) => [...prev, ...data.posts])
      setPage(nextPage)
      setTotalPages(data.totalPages)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load more posts'))
    } finally {
      setLoadingMore(false)
    }
  }

  const sideHeadlines = posts.slice(0, 4)
  const gridPosts = featured ? posts : posts

  return (
    <div className={`${PUBLIC_HEADER_OFFSET} bg-white pb-20`}>
      {/* Masthead */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Aamin Newsroom</p>
              <h1 className="mt-2 text-4xl md:text-5xl font-black tracking-tight text-slate-900">The Aamin Blog</h1>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              Emergency preparedness, public safety, first aid education, and the latest updates from Aamin Ambulance
              across Mogadishu and Somalia.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-red-600">{error}</div>
      ) : (
        <>
          {/* Top story */}
          {featured ? (
            <section className="py-10 md:py-12">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Lead story with overlay */}
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="group relative col-span-2 block overflow-hidden rounded-3xl bg-slate-900 min-h-[360px] md:min-h-[460px]"
                  >
                    {featured.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={uploadedFileUrl(featured.featuredImage)}
                        alt={featured.title}
                        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
                      <span className="inline-flex rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        {featured.category}
                      </span>
                      <h2 className="mt-4 text-2xl md:text-4xl font-black leading-tight text-white">
                        {featured.title}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm md:text-base text-slate-200 line-clamp-2">
                        {featured.excerpt}
                      </p>
                      <div className="mt-5 flex items-center gap-4 text-sm font-semibold text-slate-200">
                        {featured.publishedAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            {format(new Date(featured.publishedAt), 'MMMM d, yyyy')}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5 text-red-300 group-hover:gap-2 transition-all">
                          Read Story <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Latest headlines rail */}
                  <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Latest Headlines</p>
                    <div className="mt-4 divide-y divide-slate-200">
                      {sideHeadlines.length === 0 ? (
                        <p className="py-4 text-sm text-slate-500">More stories coming soon.</p>
                      ) : (
                        sideHeadlines.map((post, i) => (
                          <Link key={post.id} href={`/blog/${post.slug}`} className="group flex gap-3 py-4">
                            <span className="text-xl font-black text-red-600/80">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide text-red-600">
                                {post.category}
                              </p>
                              <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900 transition group-hover:text-red-600 line-clamp-2">
                                {post.title}
                              </h3>
                              {post.publishedAt ? (
                                <p className="mt-1 text-xs text-slate-400">
                                  {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                                </p>
                              ) : null}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Story grid */}
          <section className="pb-4">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-center gap-4">
                <h2 className="text-xl font-black uppercase tracking-wide text-slate-900">Latest Stories</h2>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {gridPosts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
                  No published posts yet. Check back soon.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {gridPosts.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {page < totalPages ? (
                <div className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Load More Stories
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
