'use client'

import { Suspense } from 'react'
import NotificationCenterHub from '@/components/notifications/NotificationCenterHub'
import { Loader2 } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <NotificationCenterHub />
    </Suspense>
  )
}
