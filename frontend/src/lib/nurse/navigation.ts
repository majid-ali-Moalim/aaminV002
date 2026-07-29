import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  ClipboardList,
  Bell,
  MessageSquare,
  User,
  Route,
  Building2,
} from 'lucide-react'

export type NurseNavItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

export const NURSE_NAV_ITEMS: NurseNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/nurse/dashboard', icon: LayoutGrid, exact: true },
  { id: 'mission', label: 'Active Case', href: '/nurse/mission', icon: Route },
  { id: 'hospitals', label: 'Hospitals', href: '/nurse/hospitals', icon: Building2 },
  { id: 'mission-history', label: 'Case History', href: '/nurse/mission/history', icon: ClipboardList },
  { id: 'notifications', label: 'Notifications', href: '/nurse/notifications', icon: Bell },
  { id: 'messages', label: 'Communication', href: '/nurse/chat', icon: MessageSquare },
  { id: 'profile', label: 'My Profile', href: '/nurse/profile', icon: User },
]

export const NURSE_LEGACY_REDIRECTS: Record<string, string> = {
  '/nurse/patients': '/nurse/mission',
  '/nurse/patient-care': '/nurse/mission',
  '/nurse/records': '/nurse/mission',
  '/nurse/medical-records': '/nurse/mission',
  '/nurse/handover': '/nurse/mission',
  '/nurse/treatment': '/nurse/mission',
  '/nurse/schedule': '/nurse/mission',
  '/nurse/shifts': '/nurse/mission',
  '/nurse/permissions': '/nurse/dashboard',
  '/nurse/reports': '/nurse/mission',
  '/nurse/communications': '/nurse/dashboard',
}

export function isNurseNavActive(pathname: string, item: NurseNavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
