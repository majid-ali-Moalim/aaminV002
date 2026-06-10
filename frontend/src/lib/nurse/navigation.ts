import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  HeartPulse,
  FileText,
  MessageSquare,
  ClipboardList,
  Clock,
  Bell,
  Shield,
  User,
  Route,
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
  { id: 'mission', label: 'Mission Workspace', href: '/nurse/mission', icon: Route },
  { id: 'patient-care', label: 'Patient Care', href: '/nurse/patient-care', icon: HeartPulse },
  { id: 'medical-records', label: 'Medical Records', href: '/nurse/medical-records', icon: FileText },
  { id: 'communications', label: 'Communication Center', href: '/nurse/communications', icon: MessageSquare },
  { id: 'handover', label: 'Patient Handover', href: '/nurse/handover', icon: ClipboardList },
  { id: 'shifts', label: 'Shift & Attendance', href: '/nurse/shifts', icon: Clock },
  { id: 'notifications', label: 'Notifications', href: '/nurse/notifications', icon: Bell },
  { id: 'permissions', label: 'My Permissions', href: '/nurse/permissions', icon: Shield },
  { id: 'profile', label: 'My Profile', href: '/nurse/profile', icon: User },
]

export const NURSE_LEGACY_REDIRECTS: Record<string, string> = {
  '/nurse/patients': '/nurse/patient-care',
  '/nurse/records': '/nurse/medical-records',
  '/nurse/treatment': '/nurse/patient-care?tab=treatment',
  '/nurse/schedule': '/nurse/shifts',
  '/nurse/reports': '/nurse/medical-records',
}

export function isNurseNavActive(pathname: string, item: NurseNavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
