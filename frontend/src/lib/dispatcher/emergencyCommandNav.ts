import type { LucideIcon } from 'lucide-react'
import {
  Siren,
  HeartPulse,
  Warehouse,
  ClipboardList,
  PlusCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  LayoutGrid,
  Truck,
  Building2,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  Users,
  FileText,
  Stethoscope,
  Activity,
} from 'lucide-react'

export type EmergencyCommandAccent = 'success' | 'warning' | 'critical' | 'info'

export type EmergencyCommandItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  accent?: EmergencyCommandAccent
}

export type EmergencyCommandSection = {
  title: string
  items: EmergencyCommandItem[]
  workflow?: boolean
}

export const DISPATCHER_EMERGENCY_SECTIONS: EmergencyCommandSection[] = [
  {
    title: 'Case Management',
    items: [
      { href: '/dispatcher/emergency-requests', label: 'All Emergency Cases', icon: ClipboardList, exact: true },
      { href: '/dispatcher/emergency-requests/new', label: 'New Emergency Case', icon: PlusCircle },
      { href: '/dispatcher/emergency-requests/critical', label: 'Critical Cases', icon: AlertCircle, accent: 'critical' },
      { href: '/dispatcher/emergency-requests/escalated', label: 'Delayed / Escalated', icon: AlertTriangle, accent: 'warning' },
      { href: '/dispatcher/emergency-requests/pending', label: 'Pending Cases', icon: Clock, accent: 'warning' },
      { href: '/dispatcher/emergency-requests/triage', label: 'Triage Queue', icon: AlertTriangle, accent: 'warning' },
    ],
  },
  {
    title: 'Dispatch & Missions',
    items: [
      { href: '/dispatcher/emergency-requests/pending', label: 'Dispatch Board', icon: LayoutGrid, accent: 'info' },
      { href: '/dispatcher/emergency-requests/active', label: 'Active Missions', icon: Siren },
    ],
  },
  {
    title: '',
    workflow: true,
    items: [
      { href: '/dispatcher/emergency-requests/en-route', label: 'En Route to Scene', icon: Truck, accent: 'info' },
      { href: '/dispatcher/emergency-requests/transporting', label: 'Transporting to Hospital', icon: Truck, accent: 'info' },
      { href: '/dispatcher/emergency-requests/at-hospital', label: 'Arrived at Hospital', icon: Building2 },
      { href: '/dispatcher/emergency-requests/handover', label: 'Patient Handover', icon: HeartHandshake },
      { href: '/dispatcher/emergency-requests/completed', label: 'Mission Completed', icon: CheckCircle2, accent: 'success' },
    ],
  },
  {
    title: 'Case Priority',
    items: [
      { href: '/dispatcher/emergency-requests/cancelled', label: 'Cancelled / Failed', icon: XCircle },
    ],
  },
]

export const DISPATCHER_PATIENTS_ITEMS: EmergencyCommandItem[] = [
  { href: '/dispatcher/patients', label: 'Patients', icon: Users, exact: true },
  { href: '/dispatcher/patients/cases', label: 'Cases', icon: Siren },
  { href: '/dispatcher/patients/records-reports', label: 'Records & Reports', icon: FileText },
]

export const DISPATCHER_DASHBOARD_ITEM: EmergencyCommandItem = {
  href: '/dispatcher/dashboard',
  label: 'Dispatcher Dashboard',
  icon: LayoutGrid,
  exact: true,
  accent: 'critical',
}

export const DISPATCHER_RESOURCES_ITEMS: EmergencyCommandItem[] = [
  { href: '/dispatcher/resources/availability', label: 'Ambulance Availability', icon: Truck },
  { href: '/dispatcher/resources/ambulances', label: 'Ambulance Fleet', icon: Truck },
  { href: '/dispatcher/resources/drivers', label: 'Driver Availability', icon: Users },
  { href: '/dispatcher/resources/nurses', label: 'Nurse & Hospital Resources', icon: Stethoscope },
  { href: '/dispatcher/hospital/hospitals', label: 'Hospitals', icon: Building2 },
  { href: '/dispatcher/hospital/availability', label: 'Hospital Availability', icon: Building2 },
  { href: '/dispatcher/monitoring/resources', label: 'Resource Status', icon: Activity },
]

export function isDispatcherEmergencyOperationsPath(pathname: string) {
  return pathname.startsWith('/dispatcher/emergency-requests')
}

export function isDispatcherPatientsPath(pathname: string) {
  return pathname.startsWith('/dispatcher/patients')
}

export function isDispatcherDashboardCommandPath(pathname: string) {
  return pathname === '/dispatcher/dashboard' || pathname.startsWith('/dispatcher/dashboard/')
}

export function isDispatcherResourcesPath(pathname: string) {
  return pathname.startsWith('/dispatcher/resources') || pathname.startsWith('/dispatcher/hospital')
}

export function isDispatcherEmergencyCommandPath(pathname: string) {
  return (
    isDispatcherEmergencyOperationsPath(pathname) ||
    isDispatcherPatientsPath(pathname) ||
    isDispatcherDashboardCommandPath(pathname) ||
    isDispatcherResourcesPath(pathname)
  )
}
