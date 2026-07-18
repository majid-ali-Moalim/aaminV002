'use client'

import { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useNurseStore } from '@/lib/stores/nurseStore'
import { NurseBottomNav } from '@/components/nurse/NurseBottomNav'
import { NurseThemeToggle } from '@/components/nurse/NurseThemeToggle'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  mainClassName?: string
}

export function NursePageLayout({ title, subtitle, children, mainClassName }: Props) {
  const { fullName } = useNurseEmployee()
  const { stats, connected } = useNotificationStore()
  const theme = useNurseStore((s) => s.theme)
  const unread = stats?.unread ?? 0
  const pageClass = theme === 'light' ? 'nurse-page nurse-page--light' : 'nurse-page'

  return (
    <div className={pageClass}>
      <header className="nurse-header">
        <div>
          <p className="nurse-header-kicker">👩‍⚕️ Nurse Panel</p>
          <h1 className="nurse-header-title">{title}</h1>
          {subtitle && <p className="nurse-header-sub">{subtitle}</p>}
          {fullName && !subtitle && <p className="nurse-header-sub">{fullName}</p>}
        </div>
        <div className="nurse-header-actions">
          <span className={`nurse-live-pill${connected ? '' : ' offline'}`}>
            {connected ? '● Live' : '○ Syncing'}
          </span>
          <NurseThemeToggle compact />
          <Link href="/nurse/notifications" className="nurse-notif-btn" aria-label="Notifications">
            <Bell size={18} />
            {unread > 0 && <span className="nurse-header-badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        </div>
      </header>
      <main className={mainClassName ? `nurse-main ${mainClassName}` : 'nurse-main'}>{children}</main>
      <NurseBottomNav />
    </div>
  )
}
