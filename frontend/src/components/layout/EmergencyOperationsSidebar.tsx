'use client'

import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Siren,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  PlusCircle,
  Clock,
  AlertTriangle,
  LayoutGrid,
  Truck,
  Building2,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SIDEBAR = {
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
  success: '#22C55E',
  warning: '#F59E0B',
  critical: '#EF4444',
  info: '#3B82F6',
} as const

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  accent?: keyof Pick<typeof SIDEBAR, 'success' | 'warning' | 'critical' | 'info'>
}

type MenuSection = {
  title: string
  items: MenuItem[]
  workflow?: boolean
}

const emergencySections: MenuSection[] = [
  {
    title: 'Case Management',
    items: [
      { href: '/admin/emergency-requests', label: 'All Emergency Cases', icon: ClipboardList, exact: true },
      { href: '/admin/emergency-requests/new', label: 'New Emergency Case', icon: PlusCircle },
      { href: '/admin/emergency-requests/critical', label: 'Critical Cases', icon: AlertCircle, accent: 'critical' },
      { href: '/admin/emergency-requests/escalated', label: 'Delayed / Escalated', icon: AlertTriangle, accent: 'warning' },
      { href: '/admin/emergency-requests/pending', label: 'Pending Cases', icon: Clock, accent: 'warning' },
      { href: '/admin/emergency-requests/triage', label: 'Triage Queue', icon: AlertTriangle, accent: 'warning' },
    ],
  },
  {
    title: 'Dispatch & Missions',
    items: [
      { href: '/admin/dashboard/live', label: 'Dispatch Board', icon: LayoutGrid, accent: 'info' },
      { href: '/admin/emergency-requests/active', label: 'Active Missions', icon: Siren },
    ],
  },
  {
    title: '',
    workflow: true,
    items: [
      { href: '/admin/emergency-requests/en-route', label: 'En Route to Scene', icon: Truck, accent: 'info' },
      { href: '/admin/emergency-requests/transporting', label: 'Transporting to Hospital', icon: Truck, accent: 'info' },
      { href: '/admin/emergency-requests/at-hospital', label: 'Arrived at Hospital', icon: Building2 },
      { href: '/admin/emergency-requests/handover', label: 'Patient Handover', icon: HeartHandshake },
      { href: '/admin/emergency-requests/completed', label: 'Mission Completed', icon: CheckCircle2, accent: 'success' },
    ],
  },
  {
    title: 'Case Priority',
    items: [
      { href: '/admin/emergency-requests/cancelled', label: 'Cancelled / Failed', icon: XCircle },
    ],
  },
]

function isItemActive(pathname: string, item: MenuItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function emergencyOperationsPaths(): string[] {
  const paths = ['/admin/emergency-requests', '/admin/dashboard/live', '/admin/assignment-board']
  emergencySections.forEach((section) =>
    section.items.forEach((item) => {
      if (!paths.includes(item.href)) paths.push(item.href)
    }),
  )
  return paths
}

export function isEmergencyOperationsPath(pathname: string) {
  return (
    pathname.startsWith('/admin/emergency-requests') ||
    pathname === '/admin/dashboard/live' ||
    pathname.startsWith('/admin/assignment-board')
  )
}

interface EmergencyOperationsSidebarProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export default function EmergencyOperationsSidebar({ isOpen, setOpen }: EmergencyOperationsSidebarProps) {
  const pathname = usePathname()
  const isSectionActive = isEmergencyOperationsPath(pathname)

  const renderItem = (item: MenuItem, opts?: { workflow?: boolean }) => {
    const accentColor = item.accent ? SIDEBAR[item.accent] : SIDEBAR.muted

    return (
      <SidebarMenuLink
        key={item.href + item.label}
        href={item.href}
        label={item.label}
        icon={item.icon}
        exact={item.exact}
        sidebar={SIDEBAR}
        accentColor={accentColor}
        className={`flex items-center gap-2.5 py-2 rounded-lg text-[13px] font-medium ${
          opts?.workflow ? 'pl-2 pr-2' : 'px-2.5'
        }`}
        iconClassName={`shrink-0 ${opts?.workflow ? 'w-3.5 h-3.5' : 'w-4 h-4'}`}
      />
    )
  }

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-semibold rounded-lg"
        style={
          isSectionActive
            ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.text }
            : { color: SIDEBAR.secondary }
        }
        onMouseEnter={(e) => {
          if (!isSectionActive) {
            e.currentTarget.style.backgroundColor = SIDEBAR.panel
            e.currentTarget.style.color = SIDEBAR.text
          }
        }}
        onMouseLeave={(e) => {
          if (!isSectionActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = SIDEBAR.secondary
          }
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Siren
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">Emergency Operations</span>
        </div>
        {isOpen ? (
          <ChevronDown
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
        ) : (
          <ChevronRight
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
        )}
      </button>

      {isOpen && (
        <div
          className="mt-0.5 ml-2 pl-3 py-2 space-y-4 rounded-lg"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {emergencySections.map((section, idx) => (
            <div key={`${section.title}-${idx}`}>
              {section.title && (
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
                    style={{ color: SIDEBAR.muted }}
                  >
                    {section.title}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: SIDEBAR.border }} />
                </div>
              )}

              {section.workflow ? (
                <div
                  className="ml-1 pl-3 space-y-0.5"
                  style={{ borderLeft: `1px dashed rgba(255,255,255,0.12)` }}
                >
                  {section.items.map((item) => renderItem(item, { workflow: true }))}
                </div>
              ) : (
                <div className="space-y-0.5">{section.items.map((item) => renderItem(item))}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
