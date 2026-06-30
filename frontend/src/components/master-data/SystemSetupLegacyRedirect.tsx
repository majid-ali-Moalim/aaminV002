'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REDIRECTS: Record<string, string> = {
  regions: '/admin/master-data/locations',
  districts: '/admin/master-data/locations',
  categories: '/admin/master-data/emergency',
  settings: '/admin/system-settings',
}

export default function SystemSetupLegacyRedirect({ segment }: { segment?: string }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(segment ? REDIRECTS[segment] ?? '/admin/master-data/locations' : '/admin/master-data/locations')
  }, [router, segment])
  return null
}
