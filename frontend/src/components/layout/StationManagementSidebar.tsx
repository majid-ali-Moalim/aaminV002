'use client'

import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Activity,
  BarChart2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SIDEBAR = {
  bg: 'hsl(var(--sidebar-bg))',
  panel: 'hsl(var(--sidebar-panel))',
  primary: 'hsl(var(--sidebar-primary))',
  text: 'hsl(var(--sidebar-text))',
  textActive: 'hsl(var(--sidebar-text-active))',
  secondary: 'hsl(var(--sidebar-secondary))',
  muted: 'hsl(var(--sidebar-muted))',
  border: 'hsl(var(--sidebar-border))',
} as const

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const stationMenuItems: MenuItem[] = [
  { href: '/admin/stations', label: 'Dashboard', icon: LayoutGrid, exact: true },
  { href: '/admin/stations/manage', label: 'Manage Stations', icon: Building2 },
  { href: '/admin/stations/crew', label: 'Station Crew', icon: Users },
  { href: '/admin/stations/operations', label: 'Operations', icon: Activity },
  { href: '/admin/stations/reports', label: 'Reports & Coverage', icon: BarChart2 },
]

export function isStationManagementPath(pathname: string) {
  return pathname.startsWith('/admin/stations')
}

interface StationManagementSidebarProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export default function StationManagementSidebar({ isOpen, setOpen }: StationManagementSidebarProps) {
  const pathname = usePathname()
  const isSectionActive = isStationManagementPath(pathname)

  return (
    <div className="rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 text-[13px] font-semibold rounded-lg"
        style={
          isSectionActive
            ? { backgroundColor: SIDEBAR.primary, color: SIDEBAR.textActive }
            : { color: SIDEBAR.secondary }
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Stations</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
      </button>

      {isOpen && (
        <div
          className="mt-0.5 ml-2 pl-3 py-2 space-y-0.5 rounded-lg"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {stationMenuItems.map((item) => (
            <SidebarMenuLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              exact={item.exact}
              sidebar={SIDEBAR}
            />
          ))}
        </div>
      )}
    </div>
  )
}
