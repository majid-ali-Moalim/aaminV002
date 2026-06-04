import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Siren,
  Truck,
  Users,
  MessageSquare,
  Building2,
  MapPin,
  Activity,
  FileBarChart,
  Bell,
  Wrench,
  PlusCircle,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Radio,
  Navigation,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Globe,
  List,
  Wrench as MaintenanceIcon,
  Fuel,
  Package,
  BarChart2,
  Stethoscope,
  UserCheck,
  Calendar,
  Award,
  Megaphone,
  FileText,
  Hospital,
  Bed,
  Route,
  AlertOctagon,
  Download,
  Zap,
  Search,
  Settings,
  Filter,
  ScrollText,
  Calculator,
} from 'lucide-react'

export type DispatcherModuleId =
  | 'dashboard'
  | 'operations'
  | 'ambulances'
  | 'crew'
  | 'communications'
  | 'hospital'
  | 'tracking'
  | 'incidents'
  | 'reports'
  | 'alerts'
  | 'tools'

export type NavItem = {
  slug: string
  label: string
  icon: LucideIcon
  exact?: boolean
  badgeKey?: 'pending'
}

export type NavModule = {
  id: DispatcherModuleId
  label: string
  icon: LucideIcon
  basePath: string
  items: NavItem[]
}

export const DISPATCHER_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    icon: LayoutGrid,
    basePath: '/dispatcher/dashboard',
    items: [{ slug: 'overview', label: 'Dashboard Overview', icon: LayoutGrid, exact: true }],
  },
  {
    id: 'operations',
    label: 'Emergency Operations',
    icon: Siren,
    basePath: '/dispatcher/operations',
    items: [
      { slug: 'new-case', label: 'New Emergency Case', icon: PlusCircle },
      { slug: 'all-cases', label: 'All Emergency Cases', icon: ClipboardList },
      { slug: 'pending-dispatch', label: 'Pending Dispatch', icon: Clock, badgeKey: 'pending' },
      { slug: 'dispatch-board', label: 'Dispatch Board', icon: LayoutDashboard },
      { slug: 'active-missions', label: 'Active Missions', icon: Radio },
      { slug: 'en-route', label: 'En Route to Patient', icon: Navigation },
      { slug: 'at-patient', label: 'At Patient Location', icon: MapPin },
      { slug: 'transporting', label: 'Transporting to Hospital', icon: Truck },
      { slug: 'arrived-hospital', label: 'Arrived at Hospital', icon: Building2 },
      { slug: 'handover', label: 'Patient Handover', icon: HeartHandshake },
      { slug: 'critical', label: 'Critical Cases', icon: AlertTriangle },
      { slug: 'escalated', label: 'Escalated Cases', icon: AlertOctagon },
      { slug: 'cancelled', label: 'Cancelled Missions', icon: XCircle },
      { slug: 'timeline', label: 'Mission Timeline & Logs', icon: History },
      { slug: 'public-tracking', label: 'Public Tracking', icon: Globe },
    ],
  },
  {
    id: 'ambulances',
    label: 'Ambulance Management',
    icon: Truck,
    basePath: '/dispatcher/ambulances',
    items: [
      { slug: 'all', label: 'All Ambulances', icon: List },
      { slug: 'available', label: 'Available Units', icon: CheckCircle2 },
      { slug: 'busy', label: 'Busy Units', icon: Radio },
      { slug: 'out-of-service', label: 'Out of Service Units', icon: XCircle },
      { slug: 'maintenance', label: 'Maintenance Schedule', icon: MaintenanceIcon },
      { slug: 'inspections', label: 'Vehicle Inspection Logs', icon: ClipboardList },
      { slug: 'fuel', label: 'Fuel Monitoring', icon: Fuel },
      { slug: 'equipment', label: 'Equipment Status', icon: Package },
      { slug: 'assignment-history', label: 'Ambulance Assignment History', icon: History },
      { slug: 'performance', label: 'Ambulance Performance', icon: BarChart2 },
    ],
  },
  {
    id: 'crew',
    label: 'Crew Management',
    icon: Users,
    basePath: '/dispatcher/crew',
    items: [
      { slug: 'drivers', label: 'Drivers', icon: Truck },
      { slug: 'nurses', label: 'Nurses', icon: Stethoscope },
      { slug: 'paramedics', label: 'Paramedics', icon: Activity },
      { slug: 'available', label: 'Available Crew', icon: UserCheck },
      { slug: 'on-mission', label: 'On Mission Crew', icon: Radio },
      { slug: 'off-duty', label: 'Off Duty Crew', icon: Clock },
      { slug: 'shifts', label: 'Shift Management', icon: Calendar },
      { slug: 'assignments', label: 'Crew Assignment', icon: Users },
      { slug: 'attendance', label: 'Crew Attendance', icon: ClipboardList },
      { slug: 'certifications', label: 'Crew Certifications', icon: Award },
      { slug: 'performance', label: 'Crew Performance', icon: BarChart2 },
    ],
  },
  {
    id: 'communications',
    label: 'Communication Center',
    icon: MessageSquare,
    basePath: '/dispatcher/communications',
    items: [
      { slug: 'dispatcher-chat', label: 'Dispatcher Chat', icon: MessageSquare },
      { slug: 'ambulance-chat', label: 'Ambulance Chat', icon: Truck },
      { slug: 'crew-chat', label: 'Crew Chat', icon: Users },
      { slug: 'hospital-chat', label: 'Hospital Chat', icon: Building2 },
      { slug: 'broadcasts', label: 'Emergency Broadcasts', icon: Megaphone },
      { slug: 'announcements', label: 'Internal Announcements', icon: Bell },
      { slug: 'templates', label: 'Message Templates', icon: FileText },
      { slug: 'logs', label: 'Communication Logs', icon: ScrollText },
      { slug: 'notifications', label: 'Emergency Notifications', icon: AlertTriangle },
    ],
  },
  {
    id: 'hospital',
    label: 'Hospital Coordination',
    icon: Building2,
    basePath: '/dispatcher/hospital',
    items: [
      { slug: 'directory', label: 'Hospital Directory', icon: List },
      { slug: 'receiving', label: 'Receiving Hospitals', icon: Hospital },
      { slug: 'capacity', label: 'Hospital Capacity', icon: BarChart2 },
      { slug: 'ed-status', label: 'Emergency Department Status', icon: Activity },
      { slug: 'beds', label: 'Bed Availability', icon: Bed },
      { slug: 'icu', label: 'ICU Availability', icon: HeartHandshake },
      { slug: 'destinations', label: 'Patient Destination Tracking', icon: MapPin },
      { slug: 'handover-logs', label: 'Hospital Handover Logs', icon: ClipboardList },
      { slug: 'comm-logs', label: 'Hospital Communication Logs', icon: MessageSquare },
    ],
  },
  {
    id: 'tracking',
    label: 'Tracking & Monitoring',
    icon: MapPin,
    basePath: '/dispatcher/tracking',
    items: [
      { slug: 'live-map', label: 'Live Ambulance Tracking', icon: MapPin },
      { slug: 'mission-monitor', label: 'Active Mission Monitor', icon: Radio },
      { slug: 'unit-board', label: 'Unit Status Board', icon: LayoutDashboard },
      { slug: 'case-tracking', label: 'Emergency Case Tracking', icon: Siren },
      { slug: 'delayed', label: 'Delayed Mission Monitor', icon: Clock },
      { slug: 'routes', label: 'Route Monitoring', icon: Route },
      { slug: 'location-history', label: 'Location History', icon: History },
      { slug: 'timeline', label: 'Mission Timeline', icon: ScrollText },
      { slug: 'activity', label: 'Activity Monitoring', icon: Activity },
    ],
  },
  {
    id: 'incidents',
    label: 'Incident Monitoring',
    icon: Activity,
    basePath: '/dispatcher/incidents',
    items: [
      { slug: 'high-priority', label: 'High Priority Incidents', icon: AlertTriangle },
      { slug: 'mass-casualty', label: 'Mass Casualty Incidents', icon: AlertOctagon },
      { slug: 'disaster', label: 'Disaster Events', icon: Siren },
      { slug: 'security', label: 'Security Alerts', icon: Bell },
      { slug: 'escalated', label: 'Escalated Cases', icon: AlertTriangle },
      { slug: 'failed-dispatch', label: 'Failed Dispatches', icon: XCircle },
      { slug: 'response-delays', label: 'Response Delays', icon: Clock },
      { slug: 'investigation', label: 'Incident Investigation', icon: Search },
      { slug: 'logs', label: 'Incident Logs', icon: ClipboardList },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: FileBarChart,
    basePath: '/dispatcher/reports',
    items: [
      { slug: 'missions', label: 'Mission Reports', icon: Radio },
      { slug: 'emergency-cases', label: 'Emergency Case Reports', icon: Siren },
      { slug: 'dispatcher', label: 'Dispatcher Reports', icon: Users },
      { slug: 'utilization', label: 'Ambulance Utilization', icon: Truck },
      { slug: 'crew-performance', label: 'Crew Performance Reports', icon: BarChart2 },
      { slug: 'hospital', label: 'Hospital Reports', icon: Building2 },
      { slug: 'response-time', label: 'Response Time Analysis', icon: Clock },
      { slug: 'daily', label: 'Daily Reports', icon: Calendar },
      { slug: 'monthly', label: 'Monthly Reports', icon: FileBarChart },
      { slug: 'annual', label: 'Annual Reports', icon: FileBarChart },
      { slug: 'export', label: 'Export Center', icon: Download },
    ],
  },
  {
    id: 'alerts',
    label: 'System Alerts',
    icon: Bell,
    basePath: '/dispatcher/alerts',
    items: [
      { slug: 'critical', label: 'Critical Alerts', icon: AlertTriangle },
      { slug: 'delays', label: 'Mission Delays', icon: Clock },
      { slug: 'unassigned', label: 'Unassigned Emergencies', icon: Siren },
      { slug: 'breakdowns', label: 'Ambulance Breakdowns', icon: Truck },
      { slug: 'crew-shortage', label: 'Crew Shortages', icon: Users },
      { slug: 'comm-failures', label: 'Communication Failures', icon: MessageSquare },
      { slug: 'overcapacity', label: 'Hospital Overcapacity', icon: Building2 },
      { slug: 'maintenance', label: 'Maintenance Alerts', icon: Wrench },
      { slug: 'system', label: 'System Notifications', icon: Bell },
    ],
  },
  {
    id: 'tools',
    label: 'Dispatcher Tools',
    icon: Wrench,
    basePath: '/dispatcher/tools',
    items: [
      { slug: 'quick-dispatch', label: 'Quick Dispatch', icon: Zap },
      { slug: 'priority-calc', label: 'Emergency Priority Calculator', icon: Calculator },
      { slug: 'nearest-unit', label: 'Nearest Unit Finder', icon: Search },
      { slug: 'hospital-recommend', label: 'Hospital Recommendation Engine', icon: Building2 },
      { slug: 'handover-notes', label: 'Shift Handover Notes', icon: FileText },
      { slug: 'notes', label: 'Dispatcher Notes', icon: ClipboardList },
      { slug: 'filters', label: 'Saved Filters', icon: Filter },
      { slug: 'audit', label: 'Audit Logs', icon: ScrollText },
      { slug: 'activity', label: 'Activity Logs', icon: Activity },
      { slug: 'settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function getModuleById(id: DispatcherModuleId): NavModule | undefined {
  return DISPATCHER_MODULES.find((m) => m.id === id)
}

export function getModuleByPath(pathname: string): NavModule | undefined {
  if (pathname === '/dispatcher/dashboard') return getModuleById('dashboard')
  return DISPATCHER_MODULES.find(
    (m) => m.id !== 'dashboard' && pathname.startsWith(m.basePath),
  )
}

export function getNavItem(module: NavModule, view: string): NavItem | undefined {
  return module.items.find((i) => i.slug === view)
}

export function moduleHref(module: NavModule, slug: string): string {
  if (module.id === 'dashboard') return '/dispatcher/dashboard'
  return `${module.basePath}/${slug}`
}

export function isModulePathActive(pathname: string, module: NavModule): boolean {
  if (module.id === 'dashboard') return pathname === '/dispatcher/dashboard'
  return pathname.startsWith(module.basePath)
}

export function isViewActive(pathname: string, module: NavModule, slug: string): boolean {
  const href = moduleHref(module, slug)
  if (module.id === 'dashboard') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Legacy route redirects */
export const LEGACY_DISPATCHER_REDIRECTS: Record<string, string> = {
  '/dispatcher/emergencies': '/dispatcher/operations/pending-dispatch',
  '/dispatcher/fleet': '/dispatcher/ambulances/all',
  '/dispatcher/staff': '/dispatcher/crew/drivers',
  '/dispatcher/map': '/dispatcher/tracking/live-map',
  '/dispatcher/cases': '/dispatcher/incidents/logs',
  '/dispatcher/profile': '/dispatcher/tools/settings',
}
