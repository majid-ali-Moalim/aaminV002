'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2 } from 'lucide-react'
import { blogService } from '@/lib/blog/blogApi'
import type { PublicBlogPost } from '@/lib/blog/blogConstants'
import BlogCard from './BlogCard'

export default function HomeBlogSection() {
  const [posts, setPosts] = useState<PublicBlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await blogService.publicList({ page: 1, limit: 3 })
        if (!cancelled) {
          const combined = data.featured
            ? [data.featured, ...data.posts.filter((p) => p.id !== data.featured?.id)]
            : data.posts
          setPosts(combined.slice(0, 3))
        }
      } catch {
        if (!cancelled) setPosts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loading && posts.length === 0) return null

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">Latest News</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              From the Aamin Blog
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-slate-600">
              Community awareness, emergency preparedness, and organizational updates from Aamin Ambulance.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
          >
            View All Posts
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
