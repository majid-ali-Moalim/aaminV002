'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DriverGuard } from '@/components/guards'
import { DriverSidebar } from '@/components/driver/DriverSidebar'
import { DriverNotificationProvider } from '@/components/driver/DriverNotificationProvider'
import { useDriverStore } from '@/lib/stores/driverStore'
import './driver.css'

export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const theme = useDriverStore((s) => s.theme)
  const isLoginPage = pathname === '/driver/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  const shellClass = `driver-shell driver-shell--light${theme === 'dark' ? ' driver-shell--dark-content' : ''}`

  return (
    <DriverGuard>
      <DriverNotificationProvider>
        <div className={shellClass}>
          <DriverSidebar />
          <div className="driver-viewport">{children}</div>
        </div>
      </DriverNotificationProvider>
    </DriverGuard>
  )
}
