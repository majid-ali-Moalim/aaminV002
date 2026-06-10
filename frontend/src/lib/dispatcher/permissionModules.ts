import type { LucideIcon } from 'lucide-react'
import {
  Truck,
  Stethoscope,
  Siren,
  BarChart2,
  Users,
  Settings,
  Lock,
  UserPlus,
  Building2,
  Radio,
} from 'lucide-react'
import { getPermissionLabel } from '@/lib/accessControlCatalog'
import type { NavModule } from '@/lib/dispatcher/navigation'

export type PermissionFeature = {
  key: string
  label: string
  description: string
  href?: string
  source: 'baseline' | 'granted'
}

export type GrantedSidebarUnlock = {
  permissionKey: string
  module: NavModule
}

export const PERMISSION_ACTION_LINKS: Record<string, { href: string; label: string }> = {
  'driver.create': { href: '/dispatcher/add-driver', label: 'Register new driver' },
  'nurse.create': { href: '/dispatcher/add-nurse', label: 'Register new nurse' },
  'case.create': { href: '/dispatcher/new-emergency', label: 'Create emergency case' },
  'dispatch.board': { href: '/dispatcher/emergency/pending', label: 'Open dispatch board' },
  'report.view': { href: '/dispatcher/reports/emergency', label: 'View reports' },
  'report.kpi': { href: '/dispatcher/reports/performance', label: 'KPI dashboard' },
  'hospital.manage': { href: '/dispatcher/hospital/hospitals', label: 'Manage hospitals' },
  'employee.attendance': { href: '/dispatcher/permissions/attendance', label: 'Attendance' },
}

export const GRANTED_SIDEBAR_UNLOCKS: GrantedSidebarUnlock[] = [
  {
    permissionKey: 'driver.create',
    module: {
      id: 'driver-registration' as NavModule['id'],
      label: 'Driver Registration',
      icon: UserPlus,
      basePath: '/dispatcher/add-driver',
      description: 'Register new drivers (admin-granted)',
      defaultSlug: 'register',
      standalone: true,
      items: [{ slug: 'register', label: 'Register Driver', icon: UserPlus, exact: true }],
    },
  },
  {
    permissionKey: 'nurse.create',
    module: {
      id: 'nurse-registration' as NavModule['id'],
      label: 'Nurse Registration',
      icon: Stethoscope,
      basePath: '/dispatcher/add-nurse',
      description: 'Register nurses (admin-granted)',
      defaultSlug: 'register',
      standalone: true,
      items: [{ slug: 'register', label: 'Register Nurse', icon: Stethoscope, exact: true }],
    },
  },
  {
    permissionKey: 'report.kpi',
    module: {
      id: 'reports' as NavModule['id'],
      label: 'Advanced Analytics',
      icon: BarChart2,
      basePath: '/dispatcher/reports',
      description: 'KPI and performance analytics',
      defaultSlug: 'performance',
      items: [{ slug: 'performance', label: 'Performance KPIs', icon: BarChart2 }],
    },
  },
  {
    permissionKey: 'employee.attendance',
    module: {
      id: 'permissions' as NavModule['id'],
      label: 'Staff Attendance',
      icon: Users,
      basePath: '/dispatcher/permissions',
      description: 'View attendance (admin-granted)',
      defaultSlug: 'attendance',
      items: [{ slug: 'attendance', label: 'Attendance', icon: Users }],
    },
  },
]

const PERMISSION_ICONS: Record<string, LucideIcon> = {
  driver: Truck,
  nurse: Stethoscope,
  case: Siren,
  dispatch: Radio,
  report: BarChart2,
  hospital: Building2,
  employee: Users,
  system: Settings,
  role: Lock,
  permission: Lock,
}

export function iconForPermission(key: string): LucideIcon {
  const prefix = key.split('.')[0]
  return PERMISSION_ICONS[prefix] ?? Lock
}

export function buildPermissionFeatures(
  baselineKeys: string[],
  grantedKeys: string[],
): PermissionFeature[] {
  const baselineSet = new Set(baselineKeys)
  const grantedSet = new Set(grantedKeys)
  const all = [...new Set([...baselineKeys, ...grantedKeys])]

  return all.map((key) => {
    const action = PERMISSION_ACTION_LINKS[key]
    return {
      key,
      label: getPermissionLabel(key),
      description: action?.label ?? getPermissionLabel(key),
      href: action?.href,
      source: grantedSet.has(key) ? 'granted' : 'baseline',
    }
  })
}

export function getGrantedSidebarModules(grantedKeys: string[]): NavModule[] {
  const granted = new Set(grantedKeys)
  const seen = new Set<string>()
  const modules: NavModule[] = []

  for (const unlock of GRANTED_SIDEBAR_UNLOCKS) {
    if (!granted.has(unlock.permissionKey)) continue
    const modId = unlock.module.id
    if (seen.has(modId)) continue
    seen.add(modId)
    modules.push(unlock.module)
  }

  return modules
}
