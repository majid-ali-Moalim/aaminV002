import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, CalendarDays } from 'lucide-react'
import type { PublicBlogPost } from '@/lib/blog/blogConstants'
import { uploadedFileUrl } from '@/lib/uploads/fileUrl'

export default function BlogCard({ post }: { post: PublicBlogPost }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-xl hover:shadow-slate-200/60">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-slate-100">
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={uploadedFileUrl(post.featuredImage)}
            alt={post.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-red-600/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
          {post.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {post.publishedAt ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {format(new Date(post.publishedAt), 'MMM d, yyyy')}
          </p>
        ) : null}
        <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900 transition group-hover:text-red-600">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-semibold text-slate-500">{post.author}</span>
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 text-sm font-bold text-red-600 transition group-hover:gap-2"
          >
            Read
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
