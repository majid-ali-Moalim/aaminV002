import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Siren,
  MessageSquare,
  Truck,
  HeartHandshake,
  Clock,
  AlertTriangle,
  Bell,
  User,
  Radio,
  Zap,
  ClipboardList,
  GitBranch,
  History,
  PlusCircle,
  FileText,
  LogIn,
} from 'lucide-react'

export type DriverModuleId =
  | 'dashboard'
  | 'missions'
  | 'communications'
  | 'ambulance'
  | 'transport'
  | 'shifts'
  | 'incidents'
  | 'notifications'
  | 'profile'

export type DriverNavItem = {
  slug: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

export type DriverNavModule = {
  id: DriverModuleId
  label: string
  icon: LucideIcon
  basePath: string
  /** Single-page module — no /[view] segment in URL */
  singlePage?: boolean
  items: DriverNavItem[]
}

export const DRIVER_MODULES: DriverNavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    icon: LayoutGrid,
    basePath: '/driver',
    singlePage: true,
    items: [{ slug: 'overview', label: 'Dashboard Overview', icon: LayoutGrid, exact: true }],
  },
  {
    id: 'missions',
    label: 'Mission Center',
    icon: Siren,
    basePath: '/driver/missions',
    items: [
      { slug: 'active', label: 'Active Mission', icon: Zap },
      { slug: 'assigned', label: 'Assigned Missions', icon: ClipboardList },
      { slug: 'workflow', label: 'Mission Workflow', icon: GitBranch },
      { slug: 'history', label: 'Mission History', icon: History },
    ],
  },
  {
    id: 'communications',
    label: 'Communication Center',
    icon: MessageSquare,
    basePath: '/driver/communications',
    singlePage: true,
    items: [{ slug: 'center', label: 'Communication Center', icon: MessageSquare }],
  },
  {
    id: 'ambulance',
    label: 'Ambulance Management',
    icon: Truck,
    basePath: '/driver/ambulance',
    singlePage: true,
    items: [{ slug: 'my-ambulance', label: 'My Ambulance', icon: Truck }],
  },
  {
    id: 'transport',
    label: 'Patient Transport',
    icon: HeartHandshake,
    basePath: '/driver/transport',
    singlePage: true,
    items: [{ slug: 'overview', label: 'Patient Transport', icon: HeartHandshake }],
  },
  {
    id: 'shifts',
    label: 'Shift & Attendance',
    icon: Clock,
    basePath: '/driver/shifts',
    singlePage: true,
    items: [{ slug: 'clock', label: 'Clock In / Out', icon: LogIn }],
  },
  {
    id: 'incidents',
    label: 'Incident Reports',
    icon: AlertTriangle,
    basePath: '/driver/incidents',
    items: [
      { slug: 'new', label: 'New Incident', icon: PlusCircle },
      { slug: 'submitted', label: 'Submitted Reports', icon: FileText },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    basePath: '/driver/notifications',
    singlePage: true,
    items: [{ slug: 'feed', label: 'Notifications', icon: Bell }],
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    basePath: '/driver/profile',
    singlePage: true,
    items: [{ slug: 'account', label: 'Profile', icon: User }],
  },
]

export const MISSION_WORKFLOW_STEPS = [
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'DISPATCHED', label: 'En Route to Scene' },
  { key: 'ARRIVED_SCENE', label: 'Arrived at Scene' },
  { key: 'PATIENT_ASSESSMENT', label: 'Patient Assessment' },
  { key: 'PATIENT_LOADED', label: 'Patient Loaded' },
  { key: 'TRANSPORTING', label: 'En Route to Hospital' },
  { key: 'ARRIVED_HOSPITAL', label: 'Arrived at Hospital' },
  { key: 'PATIENT_HANDOVER', label: 'Patient Handover' },
  { key: 'COMPLETED', label: 'Mission Completed' },
] as const

export const LEGACY_DRIVER_REDIRECTS: Record<string, string> = {
  '/driver/missions': '/driver/missions/active',
  '/driver/incidents': '/driver/incidents/new',
}

export function getModuleById(id: DriverModuleId): DriverNavModule | undefined {
  return DRIVER_MODULES.find((m) => m.id === id)
}

export function getModuleByPath(pathname: string): DriverNavModule | undefined {
  if (pathname === '/driver' || pathname === '/driver/dashboard') {
    return getModuleById('dashboard')
  }
  return DRIVER_MODULES.find(
    (m) => m.id !== 'dashboard' && pathname.startsWith(m.basePath),
  )
}

export function getNavItem(module: DriverNavModule, view: string): DriverNavItem | undefined {
  return module.items.find((i) => i.slug === view)
}

export function moduleHref(module: DriverNavModule, slug: string): string {
  if (module.id === 'dashboard') return '/driver'
  if (module.singlePage) return module.basePath
  return `${module.basePath}/${slug}`
}

export function isModulePathActive(pathname: string, module: DriverNavModule): boolean {
  if (module.id === 'dashboard') {
    return pathname === '/driver' || pathname === '/driver/dashboard'
  }
  return pathname.startsWith(module.basePath)
}

export function isViewActive(pathname: string, module: DriverNavModule, slug: string): boolean {
  const href = moduleHref(module, slug)
  if (module.singlePage) return pathname === href || pathname.startsWith(`${href}/`)
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function resolvePageTitle(pathname: string): string {
  const mod = getModuleByPath(pathname)
  if (!mod) return 'Driver Portal'
  if (mod.singlePage) return mod.label
  const viewSlug = pathname.replace(mod.basePath, '').replace(/^\//, '').split('/')[0]
  const view = viewSlug ? getNavItem(mod, viewSlug) : undefined
  if (view) return `${mod.label} · ${view.label}`
  return mod.label
}
