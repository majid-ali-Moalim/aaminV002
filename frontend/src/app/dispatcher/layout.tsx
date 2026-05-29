'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DispatcherGuard } from '@/components/guards'
import DispatcherSidebar from '@/components/dispatcher/DispatcherSidebar'
import DispatcherTopBar from '@/components/dispatcher/DispatcherTopBar'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

function DispatcherShell({ children }: { children: ReactNode }) {
  const { stats } = useDispatcherAccess()

  return (
    <DispatcherGuard>
      <div className="min-h-screen bg-[#0B0F19] text-white font-sans">
        <DispatcherSidebar pendingCount={stats?.pending ?? 0} />
        <div className="ml-64 flex flex-col min-h-screen">
          <DispatcherTopBar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </DispatcherGuard>
  )
}

export default function DispatcherLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/dispatcher/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return <DispatcherShell>{children}</DispatcherShell>
}
