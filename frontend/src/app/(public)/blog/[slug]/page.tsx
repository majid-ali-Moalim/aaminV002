import BlogDetailPage from '@/components/public/blog/BlogDetailPage'

export default function BlogSlugPage({ params }: { params: { slug: string } }) {
  return <BlogDetailPage slug={params.slug} />
}
