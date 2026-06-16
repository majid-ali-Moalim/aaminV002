'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { HospitalGuard } from '@/components/guards'
import { HospitalSidebar } from '@/components/hospital/HospitalSidebar'
import { HospitalNotificationProvider } from '@/components/hospital/HospitalNotificationProvider'
import '@/app/hospital/hospital.css'

const AUTH_ROUTES = ['/hospital/login', '/hospital/forgot-password', '/hospital/reset-password']

export default function HospitalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAuth = AUTH_ROUTES.some((r) => pathname === r)

  if (isAuth) {
    return <>{children}</>
  }

  return (
    <HospitalGuard>
      <HospitalNotificationProvider>
        <div className="hosp-shell">
          <HospitalSidebar />
          <main className="hosp-main">{children}</main>
        </div>
      </HospitalNotificationProvider>
    </HospitalGuard>
  )
}
