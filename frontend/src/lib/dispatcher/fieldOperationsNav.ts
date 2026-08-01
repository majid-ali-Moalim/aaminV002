import type { LucideIcon } from 'lucide-react'
import {
  Users,
  UserPlus,
  Calendar,
  Stethoscope,
  Truck,
  Activity,
  User,
  Lock,
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
  { href: '/dispatcher/resources', label: 'Station Resources', icon: Users, exact: true },
]

export const DISPATCHER_NURSE_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/resources', label: 'Station Resources', icon: Stethoscope, exact: true },
]

export const DISPATCHER_AMBULANCE_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/resources', label: 'Station Resources', icon: Truck, exact: true },
]

export const DISPATCHER_MANAGEMENT_ITEMS: FieldOpsItem[] = [
  { href: '/dispatcher/profile', label: 'My Profile', icon: User, exact: true },
  { href: '/dispatcher/permissions', label: 'My Permissions', icon: Lock },
  { href: '/dispatcher/permissions/granted', label: 'Granted Access', icon: Shield },
]

export function isDispatcherDriverPath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources') || pathname.startsWith('/dispatcher/add-driver')
}

export function isDispatcherNursePath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources') || pathname.startsWith('/dispatcher/add-nurse')
}

export function isDispatcherAmbulancePath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources')
}

export function isDispatcherManagementPath(pathname: string) {
  return (
    pathname === '/dispatcher/profile' ||
    pathname.startsWith('/dispatcher/permissions')
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
