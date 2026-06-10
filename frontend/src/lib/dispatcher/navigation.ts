import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Siren,
  Truck,
  Building2,
  MessageSquare,
  Radio,
  Bell,
  BarChart2,
  Wrench,
  User,
  Lock,
  List,
  PlusCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bed,
  HeartHandshake,
  Megaphone,
  MapPin,
  Activity,
  History,
  Search,
  Zap,
  FileText,
  Stethoscope,
  Users,
  Shield,
} from 'lucide-react'

export type DispatcherModuleId =
  | 'dashboard'
  | 'emergency'
  | 'resources'
  | 'hospital'
  | 'communications'
  | 'monitoring'
  | 'alerts'
  | 'reports'
  | 'tools'
  | 'permissions'
  | 'profile'
  | 'driver-registration'
  | 'nurse-registration'

export type NavItem = {
  slug: string
  label: string
  icon?: LucideIcon
  badgeKey?: 'pending'
  exact?: boolean
}

export type NavModule = {
  id: DispatcherModuleId
  label: string
  icon: LucideIcon
  basePath: string
  description: string
  items: NavItem[]
  defaultSlug: string
  /** When true, sidebar links directly to basePath (no /view segment). */
  standalone?: boolean
}

/** Flat sidebar — 10 main modules; details live in tabs per workspace */
export const DISPATCHER_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Operations Dashboard',
    icon: LayoutGrid,
    basePath: '/dispatcher/dashboard',
    description: 'Command center overview and quick actions',
    defaultSlug: 'overview',
    items: [{ slug: 'overview', label: 'Overview', icon: LayoutGrid, exact: true }],
  },
  {
    id: 'emergency',
    label: 'Emergency Operations',
    icon: Siren,
    basePath: '/dispatcher/emergency',
    description: 'Receive, assign, and manage emergency cases',
    defaultSlug: 'all',
    items: [
      { slug: 'all', label: 'All Cases', icon: List },
      { slug: 'new', label: 'New Cases', icon: PlusCircle },
      { slug: 'active', label: 'Active Cases', icon: Radio },
      { slug: 'pending', label: 'Pending Assignment', icon: Clock, badgeKey: 'pending' },
      { slug: 'critical', label: 'Critical Cases', icon: AlertTriangle },
      { slug: 'closed', label: 'Closed Cases', icon: CheckCircle2 },
    ],
  },
  {
    id: 'resources',
    label: 'Resource Operations',
    icon: Truck,
    basePath: '/dispatcher/resources',
    description: 'Ambulances, drivers, nurses, and availability',
    defaultSlug: 'ambulances',
    items: [
      { slug: 'ambulances', label: 'Ambulances', icon: Truck },
      { slug: 'drivers', label: 'Drivers', icon: Users },
      { slug: 'nurses', label: 'Nurses', icon: Stethoscope },
      { slug: 'availability', label: 'Availability Board', icon: Activity },
    ],
  },
  {
    id: 'hospital',
    label: 'Hospital Coordination',
    icon: Building2,
    basePath: '/dispatcher/hospital',
    description: 'Hospital capacity, incoming cases, and handovers',
    defaultSlug: 'hospitals',
    items: [
      { slug: 'hospitals', label: 'Hospitals', icon: Building2 },
      { slug: 'availability', label: 'Availability', icon: Bed },
      { slug: 'incoming', label: 'Incoming Cases', icon: Siren },
      { slug: 'handover', label: 'Handover Queue', icon: HeartHandshake },
      { slug: 'decisions', label: 'Case Decisions', icon: XCircle },
    ],
  },
  {
    id: 'communications',
    label: 'Communication Center',
    icon: MessageSquare,
    basePath: '/dispatcher/communications',
    description: 'Real-time messaging with crews and hospitals',
    defaultSlug: 'dispatch',
    items: [
      { slug: 'dispatch', label: 'Dispatch Chat', icon: MessageSquare },
      { slug: 'crew', label: 'Crew Chat', icon: Users },
      { slug: 'hospital', label: 'Hospital Chat', icon: Building2 },
      { slug: 'mission', label: 'Mission Chat', icon: Radio },
      { slug: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
    ],
  },
  {
    id: 'monitoring',
    label: 'Live Monitoring',
    icon: MapPin,
    basePath: '/dispatcher/monitoring',
    description: 'Active missions, timelines, and incidents',
    defaultSlug: 'missions',
    items: [
      { slug: 'missions', label: 'Active Missions', icon: Radio },
      { slug: 'timeline', label: 'Mission Timeline', icon: History },
      { slug: 'resources', label: 'Resource Status', icon: Activity },
      { slug: 'incidents', label: 'Incident Monitoring', icon: AlertTriangle },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts & Notifications',
    icon: Bell,
    basePath: '/dispatcher/alerts',
    description: 'Operational alerts filtered by category',
    defaultSlug: 'all',
    items: [
      { slug: 'all', label: 'All', icon: Bell },
      { slug: 'emergency', label: 'Emergency', icon: Siren },
      { slug: 'hospital', label: 'Hospital', icon: Building2 },
      { slug: 'resource', label: 'Resource', icon: Truck },
      { slug: 'system', label: 'System', icon: Activity },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart2,
    basePath: '/dispatcher/reports',
    description: 'KPIs, charts, and exportable reports',
    defaultSlug: 'emergency',
    items: [
      { slug: 'emergency', label: 'Emergency Reports', icon: Siren },
      { slug: 'dispatch', label: 'Dispatch Reports', icon: Radio },
      { slug: 'hospital', label: 'Hospital Reports', icon: Building2 },
      { slug: 'performance', label: 'Performance Reports', icon: BarChart2 },
    ],
  },
  {
    id: 'tools',
    label: 'Dispatcher Tools',
    icon: Wrench,
    basePath: '/dispatcher/tools',
    description: 'Quick dispatch, search, and operational utilities',
    defaultSlug: 'quick-dispatch',
    items: [
      { slug: 'quick-dispatch', label: 'Quick Dispatch', icon: Zap },
      { slug: 'search', label: 'Case Search', icon: Search },
      { slug: 'finder', label: 'Resource Finder', icon: Search },
      { slug: 'directory', label: 'Emergency Directory', icon: FileText },
      { slug: 'handover-notes', label: 'Shift Handover', icon: FileText },
    ],
  },
  {
    id: 'permissions',
    label: 'My Permissions',
    icon: Lock,
    basePath: '/dispatcher/permissions',
    description: 'Capabilities granted by your administrator',
    defaultSlug: 'overview',
    items: [
      { slug: 'overview', label: 'All Capabilities', icon: Lock, exact: true },
      { slug: 'granted', label: 'Admin Granted', icon: Shield, exact: true },
    ],
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: User,
    basePath: '/dispatcher/profile',
    description: 'Account, security, and preferences',
    defaultSlug: 'overview',
    items: [{ slug: 'overview', label: 'Profile', icon: User, exact: true }],
  },
]

export function getModuleById(id: DispatcherModuleId): NavModule | undefined {
  return DISPATCHER_MODULES.find((m) => m.id === id)
}

export function getModuleByPath(pathname: string): NavModule | undefined {
  if (pathname === '/dispatcher/dashboard' || pathname.startsWith('/dispatcher/dashboard/')) {
    return getModuleById('dashboard')
  }
  if (pathname === '/dispatcher/profile') return getModuleById('profile')
  if (pathname.startsWith('/dispatcher/add-driver')) return getModuleById('driver-registration')
  if (pathname.startsWith('/dispatcher/add-nurse')) return getModuleById('nurse-registration')
  return DISPATCHER_MODULES.find(
    (m) => m.id !== 'dashboard' && m.id !== 'profile' && pathname.startsWith(m.basePath),
  )
}

export function getNavItem(module: NavModule, view: string): NavItem | undefined {
  return module.items.find((i) => i.slug === view)
}

export function moduleHref(module: NavModule, slug: string): string {
  if (module.id === 'dashboard') return '/dispatcher/dashboard'
  if (module.id === 'profile') return '/dispatcher/profile'
  if (module.standalone) return module.basePath
  return `${module.basePath}/${slug}`
}

export function moduleDefaultHref(module: NavModule): string {
  if (module.standalone) return module.basePath
  return moduleHref(module, module.defaultSlug)
}

export function isModulePathActive(pathname: string, module: NavModule): boolean {
  if (module.id === 'dashboard') return pathname === '/dispatcher/dashboard'
  if (module.id === 'profile') return pathname === '/dispatcher/profile'
  if (module.standalone) return pathname === module.basePath || pathname.startsWith(`${module.basePath}/`)
  return pathname.startsWith(module.basePath)
}

export function isViewActive(pathname: string, module: NavModule, slug: string): boolean {
  const href = moduleHref(module, slug)
  if (module.id === 'dashboard' || module.id === 'profile') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Map new tab slugs to existing dispatcher-app API views */
export const EMERGENCY_VIEW_API: Record<string, string> = {
  all: 'all-cases',
  new: 'pending-dispatch',
  active: 'active-missions',
  pending: 'dispatch-board',
  critical: 'critical',
  closed: 'closed',
}

export const HOSPITAL_VIEW_API: Record<string, string> = {
  hospitals: 'directory',
  availability: 'capacity',
  incoming: 'incoming',
  handover: 'handover',
  decisions: 'decisions',
}

export const RESOURCE_VIEW_API: Record<string, string> = {
  ambulances: 'all',
  drivers: 'drivers',
  nurses: 'nurses',
  availability: 'available',
}

export const MONITORING_VIEW_API: Record<string, string> = {
  missions: 'mission-monitor',
  timeline: 'timeline',
  resources: 'unit-board',
  incidents: 'high-priority',
}

export const ALERTS_VIEW_API: Record<string, string> = {
  all: 'all',
  emergency: 'critical',
  hospital: 'overcapacity',
  resource: 'unassigned',
  system: 'system',
}

/** Legacy route redirects */
export const LEGACY_DISPATCHER_REDIRECTS: Record<string, string> = {
  '/dispatcher/emergencies': '/dispatcher/emergency/pending',
  '/dispatcher/operations': '/dispatcher/emergency/all',
  '/dispatcher/fleet': '/dispatcher/resources/ambulances',
  '/dispatcher/ambulances': '/dispatcher/resources/ambulances',
  '/dispatcher/staff': '/dispatcher/resources/drivers',
  '/dispatcher/crew': '/dispatcher/resources/drivers',
  '/dispatcher/map': '/dispatcher/monitoring/missions',
  '/dispatcher/tracking': '/dispatcher/monitoring/missions',
  '/dispatcher/incidents': '/dispatcher/monitoring/incidents',
  '/dispatcher/cases': '/dispatcher/monitoring/incidents',
}
