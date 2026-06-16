import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Siren,
  Truck,
  ClipboardList,
  BedDouble,
  MessageSquare,
  Bell,
  BarChart3,
  ShieldCheck,
  User,
} from 'lucide-react'

export type HospitalNavChild = {
  id: string
  label: string
  href: string
}

export type HospitalNavItem = {
  id: string
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  children?: HospitalNavChild[]
}

export const HOSPITAL_NAV_ITEMS: HospitalNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/hospital/dashboard', icon: LayoutGrid, exact: true },
  {
    id: 'cases',
    label: 'Emergency Cases',
    href: '/hospital/emergency-cases',
    icon: Siren,
    children: [
      { id: 'incoming', label: 'Incoming Cases', href: '/hospital/emergency-cases?tab=incoming' },
      { id: 'active', label: 'Active Incoming Missions', href: '/hospital/emergency-cases?tab=active' },
      { id: 'accepted', label: 'Accepted Cases', href: '/hospital/emergency-cases?tab=accepted' },
      { id: 'rejected', label: 'Rejected Cases', href: '/hospital/emergency-cases?tab=rejected' },
      { id: 'completed', label: 'Completed Cases', href: '/hospital/emergency-cases?tab=completed' },
    ],
  },
  { id: 'ambulances', label: 'Patient Reception', href: '/hospital/incoming-ambulances', icon: Truck },
  { id: 'handover', label: 'Handover Management', href: '/hospital/handover', icon: ClipboardList },
  { id: 'capacity', label: 'Capacity & Availability', href: '/hospital/capacity', icon: BedDouble },
  { id: 'communications', label: 'Communication Center', href: '/hospital/communications', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', href: '/hospital/notifications', icon: Bell },
  { id: 'reports', label: 'Reports & Analytics', href: '/hospital/reports', icon: BarChart3 },
  { id: 'permissions', label: 'My Permissions', href: '/hospital/permissions', icon: ShieldCheck },
  { id: 'profile', label: 'My Profile', href: '/hospital/profile', icon: User },
]

export function isHospitalNavActive(pathname: string, item: HospitalNavItem): boolean {
  if (item.exact) return pathname === item.href
  if (item.children?.length) {
    return (
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`) ||
      pathname.startsWith('/hospital/emergency-cases')
    )
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function isHospitalNavChildActive(pathname: string, search: string, child: HospitalNavChild): boolean {
  if (!pathname.startsWith('/hospital/emergency-cases')) return false
  const tab = new URLSearchParams(search).get('tab') || 'incoming'
  return child.href.includes(`tab=${tab}`)
}
