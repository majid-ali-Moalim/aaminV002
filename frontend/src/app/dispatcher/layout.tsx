'use client'

import { ReactNode, useState } from 'react'
import { usePathname } from 'next/navigation'
import { DispatcherGuard } from '@/components/guards'
import DispatcherSidebarSections from '@/components/dispatcher/DispatcherSidebar'
import DispatcherTopBar from '@/components/dispatcher/DispatcherTopBar'
import { DispatcherNotificationProvider } from '@/components/dispatcher/DispatcherNotificationProvider'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { OptimisticNavProvider } from '@/lib/navigation/optimisticNav'
import { EmergencyPortalProvider } from '@/lib/emergency/EmergencyPortalContext'

function DispatcherShell({ children }: { children: ReactNode }) {
  const { stats } = useDispatcherAccess()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <OptimisticNavProvider>
      <DispatcherGuard>
        <DispatcherNotificationProvider>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <DispatcherSidebarSections
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="lg:ml-72 flex flex-col min-h-screen">
            <DispatcherTopBar onMenuClick={() => setSidebarOpen(true)} />
            <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
          </div>
        </div>
        </DispatcherNotificationProvider>
      </DispatcherGuard>
    </OptimisticNavProvider>
  )
}

export default function DispatcherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/dispatcher/login'
  const isFullScreen = pathname === '/dispatcher/new-emergency' || pathname === '/dispatcher/emergency-requests/new'

  if (isLoginPage) {
    return <>{children}</>
  }

  if (isFullScreen) {
    return (
      <DispatcherGuard>
        <EmergencyPortalProvider portal="dispatcher">
          <div className="min-h-screen">{children}</div>
        </EmergencyPortalProvider>
      </DispatcherGuard>
    )
  }

  return <DispatcherShell>{children}</DispatcherShell>
}
