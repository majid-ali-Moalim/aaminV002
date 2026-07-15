import type { LucideIcon } from 'lucide-react'
import { Lock, User } from 'lucide-react'

export type AccountNavItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

/** Account section only — notifications live under Dashboard in the main sidebar */
export const DISPATCHER_ACCOUNT_ITEMS: AccountNavItem[] = [
  { href: '/dispatcher/permissions', label: 'My Permissions', icon: Lock },
  { href: '/dispatcher/profile', label: 'Profile', icon: User, exact: true },
]

export function isDispatcherAccountPath(pathname: string) {
  if (pathname === '/dispatcher/profile') return true
  if (pathname.startsWith('/dispatcher/permissions')) return true
  return false
}
