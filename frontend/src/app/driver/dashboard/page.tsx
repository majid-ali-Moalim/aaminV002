'use client'

/**
 * /driver/dashboard
 * Redirect alias → /driver (the actual dashboard page).
 * This ensures links from AuthContext (/driver) and any
 * hard-coded /driver/dashboard references both work.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DriverDashboardAlias() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/driver')
  }, [router])
  return null
}
