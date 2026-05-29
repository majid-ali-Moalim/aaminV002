'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  ScrollText,
  MapPin,
  Globe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
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
      { href: '/admin/emergency-requests/pending', label: 'Pending Cases', icon: Clock },
      { href: '/admin/emergency-requests/triage', label: 'Triage Queue', icon: AlertTriangle },
    ],
  },
  {
    title: 'Dispatch & Missions',
    items: [
      { href: '/admin/dashboard/live', label: 'Dispatch Board', icon: LayoutGrid },
      { href: '/admin/emergency-requests/active', label: 'Active Missions', icon: Siren },
    ],
  },
  {
    title: '',
    workflow: true,
    items: [
      { href: '/admin/emergency-requests/en-route', label: 'En Route to Scene', icon: Truck },
      { href: '/admin/emergency-requests/transporting', label: 'Transporting to Hospital', icon: Truck },
      { href: '/admin/emergency-requests/at-hospital', label: 'Arrived at Hospital', icon: Building2 },
      { href: '/admin/emergency-requests/handover', label: 'Patient Handover', icon: HeartHandshake },
      { href: '/admin/emergency-requests/completed', label: 'Mission Completed', icon: CheckCircle2 },
    ],
  },
  {
    title: 'Case Priority',
    items: [
      { href: '/admin/emergency-requests/critical', label: 'Critical Cases', icon: AlertCircle },
      { href: '/admin/emergency-requests/escalated', label: 'Delayed / Escalated', icon: AlertTriangle },
      { href: '/admin/emergency-requests/cancelled', label: 'Cancelled / Failed', icon: XCircle },
    ],
  },
  {
    title: 'Monitoring & Tracking',
    items: [
      { href: '/admin/emergency-requests/timeline', label: 'Mission Timeline & Logs', icon: ScrollText },
      { href: '/admin/emergency-requests/live-tracking', label: 'Live Unit Tracking', icon: MapPin },
      { href: '/admin/emergency-requests/public-tracking', label: 'Public Tracking', icon: Globe },
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
    const active = isItemActive(pathname, item)
    const Icon = item.icon

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        className={`flex items-center gap-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
          opts?.workflow ? 'pl-2 pr-2' : 'px-2.5'
        } ${
          active
            ? 'bg-red-600 text-white font-semibold shadow-sm shadow-red-100'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <Icon
          className={`shrink-0 ${opts?.workflow ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
            active ? 'text-white' : 'text-slate-400'
          }`}
        />
        <span className="truncate leading-tight">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 ${
          isSectionActive
            ? 'bg-red-600 text-white shadow-md shadow-red-200'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Siren className={`w-4 h-4 shrink-0 ${isSectionActive ? 'text-white' : 'text-slate-400'}`} />
          <span className="truncate">Emergency Operations</span>
        </div>
        {isOpen ? (
          <ChevronDown className={`w-4 h-4 shrink-0 ${isSectionActive ? 'text-white' : 'text-slate-400'}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 shrink-0 ${isSectionActive ? 'text-white' : 'text-slate-400'}`} />
        )}
      </button>

      {isOpen && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-slate-200 py-2 space-y-4">
          {emergencySections.map((section, idx) => (
            <div key={`${section.title}-${idx}`}>
              {section.title && (
                <div className="flex items-center gap-2 px-1 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 whitespace-nowrap">
                    {section.title}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {section.workflow ? (
                <div className="ml-1 pl-3 border-l border-dashed border-slate-300 space-y-0.5">
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
