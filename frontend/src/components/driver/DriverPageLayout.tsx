'use client'

import { DriverHeader } from '@/components/driver/DriverHeader'
import { DriverBottomNav } from '@/components/driver/DriverBottomNav'
import { OfflineBanner } from '@/components/driver/DriverUI'
import { useDriverStore } from '@/lib/stores/driverStore'

export function DriverPageLayout({
  title,
  children,
  showBack,
  backHref,
  mainClassName,
}: {
  title: string
  children: React.ReactNode
  showBack?: boolean
  backHref?: string
  mainClassName?: string
}) {
  const { offlineQueue } = useDriverStore()

  return (
    <div className="driver-app">
      <DriverHeader title={title} showBack={showBack} backHref={backHref} />
      <OfflineBanner queueCount={offlineQueue.length} />
      <main className={mainClassName ? `driver-main ${mainClassName}` : 'driver-main'}>{children}</main>
      <DriverBottomNav />
    </div>
  )
}
