'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RecentActivitiesWidget } from '@/components/dashboard/RecentActivitiesWidget'

export default function AdminDashboardActivitiesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600 hover:text-red-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
      <RecentActivitiesWidget variant="page" />
    </div>
  )
}
