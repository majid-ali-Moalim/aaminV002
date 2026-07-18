'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DriverGuard } from '@/components/guards'
import { DriverSidebar } from '@/components/driver/DriverSidebar'
import { DriverNotificationProvider } from '@/components/driver/DriverNotificationProvider'
import ChatAlerts from '@/components/chat/ChatAlerts'
import { useDriverStore } from '@/lib/stores/driverStore'
import './driver.css'
import '@/components/shared/field-case-detail.css'

export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const theme = useDriverStore((s) => s.theme)
  const isLoginPage = pathname === '/driver/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  const shellClass = theme === 'light' ? 'driver-shell driver-shell--light' : 'driver-shell'

  return (
    <DriverGuard>
      <DriverNotificationProvider>
        <ChatAlerts />
        <div className={shellClass}>
          <DriverSidebar />
          <div className="driver-viewport">{children}</div>
        </div>
      </DriverNotificationProvider>
    </DriverGuard>
  )
}
