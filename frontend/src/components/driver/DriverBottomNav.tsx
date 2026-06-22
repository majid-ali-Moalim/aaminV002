'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Siren, Bell, User } from 'lucide-react'
import { useDriverStore } from '@/lib/stores/driverStore'

const navItems = [
  { href: '/driver', icon: LayoutGrid, label: 'Home', match: (p: string) => p === '/driver' || p === '/driver/dashboard' },
  { href: '/driver/missions/active', icon: Siren, label: 'Missions', match: (p: string) => p.startsWith('/driver/missions') },
  { href: '/driver/notifications', icon: Bell, label: 'Alerts', match: (p: string) => p.startsWith('/driver/notifications'), badge: true },
  { href: '/driver/profile', icon: User, label: 'Profile', match: (p: string) => p.startsWith('/driver/profile') },
]

export function DriverBottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useDriverStore()

  return (
    <nav className="driver-bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ href, icon: Icon, label, match, badge }) => {
        const isActive = match(pathname)
        const showBadge = badge && unreadCount > 0

        return (
          <Link key={href} href={href} className={`driver-nav-item${isActive ? ' active' : ''}`}>
            <div className="driver-nav-icon-wrap">
              <Icon size={22} />
              {showBadge && (
                <span className="driver-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </div>
            <span className="driver-nav-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
