'use client'

import BlogPostForm from '@/components/admin/blog/BlogPostForm'

export default function AdminBlogEditPage({ params }: { params: { id: string } }) {
  return <BlogPostForm mode="edit" postId={params.id} />
}
