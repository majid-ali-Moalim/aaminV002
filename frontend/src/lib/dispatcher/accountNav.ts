import type { LucideIcon } from 'lucide-react'
import { BarChart2, Bell, Lock, User } from 'lucide-react'

export type AccountNavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export const DISPATCHER_ACCOUNT_ITEMS: AccountNavItem[] = [
  { href: '/dispatcher/reports', label: 'Reports', icon: BarChart2 },
  { href: '/dispatcher/alerts', label: 'Notifications', icon: Bell },
  { href: '/dispatcher/permissions', label: 'My Permissions', icon: Lock },
  { href: '/dispatcher/profile', label: 'Profile', icon: User, exact: true },
]

export function isDispatcherAccountPath(pathname: string) {
  if (pathname === '/dispatcher/profile') return true
  if (pathname.startsWith('/dispatcher/reports')) return true
  if (pathname.startsWith('/dispatcher/alerts')) return true
  if (pathname.startsWith('/dispatcher/permissions')) return true
  return false
}
