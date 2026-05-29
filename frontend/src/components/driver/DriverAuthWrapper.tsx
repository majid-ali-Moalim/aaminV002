'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useDriverStore } from '@/lib/stores/driverStore'

// Public paths that don't require driver auth
const PUBLIC_DRIVER_PATHS = ['/driver/login']

export function DriverAuthWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useDriverStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  // Wait for Zustand persisted state to hydrate from localStorage
  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const isPublic = PUBLIC_DRIVER_PATHS.some((p) => pathname?.startsWith(p))
    if (!isAuthenticated && !isPublic) {
      router.replace('/driver/login')
    }
  }, [hydrated, isAuthenticated, pathname, router])

  // Don't flash protected content before hydration
  if (!hydrated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid #dc2626',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const isPublic = PUBLIC_DRIVER_PATHS.some((p) => pathname?.startsWith(p))
  if (!isAuthenticated && !isPublic) return null

  return <>{children}</>
}
