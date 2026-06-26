'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getPostLoginPath, isAdminUser } from '@/lib/authRedirect'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminTopBar from '@/components/layout/AdminTopBar'
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider'
import LiveToastContainer from '@/components/notifications/LiveToastContainer'
import { OptimisticNavProvider, NavigationProgressBar } from '@/lib/navigation/optimisticNav'
import { EmergencyPortalProvider } from '@/lib/emergency/EmergencyPortalContext'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Full-screen immersive routes (no sidebar / topbar)
  const isFullScreen = ['/admin/emergency-requests/new', '/admin/drivers/add', '/admin/nurses/add', '/admin/dispatchers/add'].includes(pathname)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (!isAdminUser(user)) {
        router.replace(getPostLoginPath(user))
      }
    }
  }, [user, loading, router])

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdminUser(user)) {
    return null
  }

  // Immersive full-screen mode — sidebar & topbar hidden
  if (isFullScreen) {
    return (
      <EmergencyPortalProvider portal="admin">
        <div className="min-h-screen bg-[#F3F4F6]">
          <LiveToastContainer />
          {children}
        </div>
      </EmergencyPortalProvider>
    )
  }

  return (
    <EmergencyPortalProvider portal="admin">
      <AdminThemeProvider>
      <OptimisticNavProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
          <LiveToastContainer />
          <NavigationProgressBar />
          <AdminSidebar />
          <div className="ml-64">
            <AdminTopBar />
            <main className="p-6 dark:text-slate-100">{children}</main>
          </div>
        </div>
      </OptimisticNavProvider>
      </AdminThemeProvider>
    </EmergencyPortalProvider>
  )
}
