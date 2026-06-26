'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Route, Clock, Bell, User } from 'lucide-react'
import { useNotificationStore } from '@/lib/stores/notificationStore'

const navItems = [
  {
    href: '/nurse/dashboard',
    icon: LayoutGrid,
    label: 'Home',
    match: (p: string) => p === '/nurse' || p === '/nurse/dashboard',
  },
  {
    href: '/nurse/mission',
    icon: Route,
    label: 'Cases',
    match: (p: string) => p.startsWith('/nurse/mission'),
  },
  {
    href: '/nurse/shifts',
    icon: Clock,
    label: 'Shifts',
    match: (p: string) => p.startsWith('/nurse/shifts'),
  },
  {
    href: '/nurse/notifications',
    icon: Bell,
    label: 'Alerts',
    match: (p: string) => p.startsWith('/nurse/notifications'),
    badge: true,
  },
  {
    href: '/nurse/profile',
    icon: User,
    label: 'Profile',
    match: (p: string) => p.startsWith('/nurse/profile') || p.startsWith('/nurse/permissions'),
  },
]

export function NurseBottomNav() {
  const pathname = usePathname()
  const { stats } = useNotificationStore()
  const unread = stats?.unread ?? 0

  return (
    <nav className="nurse-bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ href, icon: Icon, label, match, badge }) => {
        const isActive = match(pathname)
        const showBadge = badge && unread > 0

        return (
          <Link key={href} href={href} className={`nurse-nav-item${isActive ? ' active' : ''}`}>
            <div className="nurse-nav-icon-wrap">
              <Icon size={22} />
              {showBadge && (
                <span className="nurse-nav-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </div>
            <span className="nurse-nav-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
