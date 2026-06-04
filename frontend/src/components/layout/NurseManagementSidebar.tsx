'use client'

import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Users,
  UserCheck,
  FileText,
  HeartHandshake,
  ClipboardList,
  History,
  TrendingUp,
  BarChart2,
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
  info: '#3B82F6',
} as const

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  accent?: keyof Pick<typeof SIDEBAR, 'success' | 'warning' | 'info'>
}

const nurseMenuItems: MenuItem[] = [
  { href: '/admin/nurses', label: 'Nurses', icon: Users, exact: true },
  { href: '/admin/nurses/active', label: 'Active Nurses', icon: UserCheck },
  { href: '/admin/nurses/records', label: 'Patient Care Records', icon: FileText },
  { href: '/admin/nurses/care-records', label: 'Medical Assessments', icon: HeartHandshake, accent: 'info' },
  { href: '/admin/nurses/treatment-records', label: 'Treatment Records', icon: ClipboardList },
  { href: '/admin/nurses/mission-history', label: 'Mission History', icon: History },
  { href: '/admin/nurses/performance', label: 'Performance', icon: TrendingUp },
  { href: '/admin/nurses/reports', label: 'Reports', icon: BarChart2 },
]

function isItemActive(pathname: string, item: MenuItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function isNurseManagementPath(pathname: string) {
  if (!pathname.startsWith('/admin/nurses')) return false
  if (pathname.startsWith('/admin/nurses/availability')) return false
  return true
}

interface NurseManagementSidebarProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export default function NurseManagementSidebar({ isOpen, setOpen }: NurseManagementSidebarProps) {
  const pathname = usePathname()
  const isSectionActive = isNurseManagementPath(pathname)

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
          <Stethoscope
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">Nurse Management</span>
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
          className="mt-0.5 ml-2 pl-3 py-2 space-y-0.5 rounded-lg"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {nurseMenuItems.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  )
}
