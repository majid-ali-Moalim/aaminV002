'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Bell, User, Ambulance } from 'lucide-react'
import { useDriverStore } from '@/lib/stores/driverStore'

const navItems = [
  { href: '/driver', icon: Home, label: 'Dashboard' },
  { href: '/driver/missions', icon: ClipboardList, label: 'Missions' },
  { href: '/driver/ambulance', icon: Ambulance, label: 'Ambulance' },
  { href: '/driver/notifications', icon: Bell, label: 'Alerts' },
  { href: '/driver/profile', icon: User, label: 'Profile' },
]

export function DriverBottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useDriverStore()

  return (
    <nav className="driver-bottom-nav">
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/driver' && pathname.startsWith(href))
        const isBell = label === 'Alerts'

        return (
          <Link key={href} href={href} className={`driver-nav-item${isActive ? ' active' : ''}`}>
            <div className="driver-nav-icon-wrap">
              <Icon size={22} />
              {isBell && unreadCount > 0 && (
                <span className="driver-nav-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="driver-nav-label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
