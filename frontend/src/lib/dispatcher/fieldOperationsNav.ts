import type { LucideIcon } from 'lucide-react'
import {
  Users,
  UserPlus,
  Calendar,
  Stethoscope,
  Truck,
  Activity,
  Radio,
  User,
  Lock,
  BarChart2,
  Shield,
} from 'lucide-react'

export type FieldOpsAccent = 'success' | 'warning' | 'critical' | 'info'

export type FieldOpsItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  accent?: FieldOpsAccent
}

export const DISPATCHER_DRIVER_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/resources/drivers', label: 'All Drivers', icon: Users, exact: true },
  { href: '/dispatcher/add-driver', label: 'Register Driver', icon: UserPlus },
  { href: '/dispatcher/resources/availability', label: 'Availability Board', icon: Calendar, accent: 'info' },
]

export const DISPATCHER_NURSE_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/resources/nurses', label: 'All Nurses', icon: Users, exact: true },
  { href: '/dispatcher/add-nurse', label: 'Register Nurse', icon: UserPlus },
  { href: '/dispatcher/resources/availability', label: 'Availability Board', icon: Activity, accent: 'info' },
]

export const DISPATCHER_AMBULANCE_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/resources/ambulances', label: 'Ambulance Fleet', icon: Truck, exact: true },
  { href: '/dispatcher/resources/availability', label: 'Availability Board', icon: Activity },
  { href: '/dispatcher/monitoring/resources', label: 'Resource Status', icon: Activity, accent: 'info' },
]

export const DISPATCHER_MANAGEMENT_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/profile', label: 'My Profile', icon: User, exact: true },
  { href: '/dispatcher/permissions', label: 'My Permissions', icon: Lock },
  { href: '/dispatcher/permissions/granted', label: 'Granted Access', icon: Shield },
  { href: '/dispatcher/reports/emergency', label: 'Performance Reports', icon: BarChart2 },
]

export function isDispatcherDriverPath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources/drivers') || pathname.startsWith('/dispatcher/add-driver')
}

export function isDispatcherNursePath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources/nurses') || pathname.startsWith('/dispatcher/add-nurse')
}

export function isDispatcherAmbulancePath(pathname: string) {
  return (
    pathname.startsWith('/dispatcher/resources/ambulances') ||
    pathname.startsWith('/dispatcher/monitoring/resources')
  )
}

export function isDispatcherManagementPath(pathname: string) {
  return (
    pathname === '/dispatcher/profile' ||
    pathname.startsWith('/dispatcher/permissions') ||
    pathname.startsWith('/dispatcher/reports')
  )
}

export function isDispatcherFieldOperationsPath(pathname: string) {
  return (
    isDispatcherDriverPath(pathname) ||
    isDispatcherNursePath(pathname) ||
    isDispatcherAmbulancePath(pathname) ||
    isDispatcherManagementPath(pathname)
  )
}
