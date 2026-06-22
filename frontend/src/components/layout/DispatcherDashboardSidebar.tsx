'use client'

import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Radio,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Monitor,
  Clock,
  Siren,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  Users,
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
}

const dispatcherSections: MenuSection[] = [
  {
    title: 'Command Center',
    items: [
      {
        href: '/admin/dispatcher-dashboard',
        label: 'Dispatcher Dashboard',
        icon: LayoutGrid,
        exact: true,
        accent: 'critical',
      },
      { href: '/admin/dispatch-management', label: 'Live Dispatch Board', icon: Monitor, accent: 'info' },
      { href: '/admin/assignment-board', label: 'Assignment Board', icon: ClipboardList, accent: 'info' },
    ],
  },
  {
    title: 'Queues & Alerts',
    items: [
      { href: '/admin/emergency-requests/pending', label: 'Pending Review', icon: Clock, accent: 'warning' },
      { href: '/admin/emergency-requests/critical', label: 'Critical Cases', icon: AlertCircle, accent: 'critical' },
      { href: '/admin/emergency-requests/escalated', label: 'Delayed / Escalated', icon: AlertTriangle, accent: 'warning' },
      { href: '/admin/emergency-requests/active', label: 'Active Missions', icon: Siren },
    ],
  },
  {
    title: 'Resources',
    items: [
      { href: '/admin/ambulances/availability', label: 'Ambulance Availability', icon: Monitor },
      { href: '/admin/drivers/availability', label: 'Driver Availability', icon: Users },
      { href: '/admin/dispatchers', label: 'All Dispatchers', icon: Radio },
    ],
  },
]

export function isDispatcherDashboardPath(pathname: string) {
  if (pathname === '/admin/dispatcher-dashboard') return true
  if (pathname === '/admin/dispatch-management') return true
  if (pathname === '/admin/assignment-board') return true
  if (pathname.startsWith('/admin/dispatchers')) return true
  return false
}

interface DispatcherDashboardSidebarProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export default function DispatcherDashboardSidebar({ isOpen, setOpen }: DispatcherDashboardSidebarProps) {
  const pathname = usePathname()
  const isSectionActive = isDispatcherDashboardPath(pathname)

  const renderItem = (item: MenuItem) => {
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
        className="flex items-center gap-2.5 py-2 px-2.5 rounded-lg text-[13px] font-medium"
        iconClassName="w-4 h-4 shrink-0"
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
          <Radio
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">Dispatcher Dashboard</span>
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
          {dispatcherSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 px-1 mb-2">
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
                  style={{ color: SIDEBAR.muted }}
                >
                  {section.title}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: SIDEBAR.border }} />
              </div>
              <div className="space-y-0.5">{section.items.map((item) => renderItem(item))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
