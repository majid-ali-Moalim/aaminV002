'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Role } from '@/types'
import AdminSidebar from '@/components/layout/AdminSidebar'
import AdminTopBar from '@/components/layout/AdminTopBar'
import LiveToastContainer from '@/components/notifications/LiveToastContainer'

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
      } else if (user.role !== Role.ADMIN) {
        router.push('/unauthorized')
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== Role.ADMIN) {
    return null
  }

  // Immersive full-screen mode — sidebar & topbar hidden
  if (isFullScreen) {
    return (
      <div className="min-h-screen bg-[#F3F4F6]">
        <LiveToastContainer />
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LiveToastContainer />
      <AdminSidebar />
      <div className="ml-64">
        <AdminTopBar />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
