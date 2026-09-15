'use client'

import BlogPreviewPage from '@/components/admin/blog/BlogPreviewPage'

export default function AdminBlogPreviewRoute({ params }: { params: { id: string } }) {
  return <BlogPreviewPage postId={params.id} />
}
