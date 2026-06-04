'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const TAB_MAP: Record<string, string> = {
  missions: 'all',
  communication: 'all',
  attendance: 'all',
  hospitals: 'all',
  incidents: 'all',
  system: 'all',
  broadcasts: 'broadcasts',
  alerts: 'critical',
  urgent: 'critical',
  settings: 'settings',
  'delivery-logs': 'all',
}

export default function NotificationSubRedirect({ segment }: { segment: string }) {
  const router = useRouter()
  useEffect(() => {
    const tab = TAB_MAP[segment] ?? 'all'
    router.replace(`/admin/notifications?tab=${tab}`)
  }, [router, segment])
  return null
}
