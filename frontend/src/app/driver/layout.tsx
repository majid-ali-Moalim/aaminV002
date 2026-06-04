'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DriverGuard } from '@/components/guards'
import { DriverSidebar } from '@/components/driver/DriverSidebar'
import './driver.css'

export default function DriverLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/driver/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <DriverGuard>
      <div className="driver-shell">
        <DriverSidebar />
        <div className="driver-viewport">{children}</div>
      </div>
    </DriverGuard>
  )
}
