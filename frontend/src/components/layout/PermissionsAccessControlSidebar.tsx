'use client'

import { usePathname } from 'next/navigation'
import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import {
  Lock,
  ChevronDown,
  ChevronRight,
  Key,
  Clock,
  ScrollText,
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
} as const

type MenuItem = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
}

const accessControlMenuItems: MenuItem[] = [
  { href: '/admin/access-control/permissions', label: 'Permissions', icon: Key, exact: true },
  { href: '/admin/access-control/access-management', label: 'Access Management', icon: Clock },
  { href: '/admin/access-control/audit-logs', label: 'Audit Logs', icon: ScrollText },
]

function isItemActive(pathname: string, item: MenuItem) {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function isAccessControlPath(pathname: string) {
  if (pathname.startsWith('/admin/access-control')) return true
  if (pathname.startsWith('/admin/permissions')) return true
  if (pathname.startsWith('/admin/audit-logs')) return true
  return false
}

interface PermissionsAccessControlSidebarProps {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

export default function PermissionsAccessControlSidebar({
  isOpen,
  setOpen,
}: PermissionsAccessControlSidebarProps) {
  const pathname = usePathname()
  const isSectionActive = isAccessControlPath(pathname)

  const renderItem = (item: MenuItem) => (
    <SidebarMenuLink
      key={item.href + item.label}
      href={item.href}
      label={item.label}
      icon={item.icon}
      exact={item.exact}
      sidebar={SIDEBAR}
    />
  )

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
          <Lock
            className="w-4 h-4 shrink-0"
            style={{ color: isSectionActive ? SIDEBAR.text : SIDEBAR.muted }}
          />
          <span className="truncate">Permissions & Access Control</span>
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
          className="mt-0.5 ml-2 pl-3 py-2 space-y-0.5 rounded-lg max-h-[420px] overflow-y-auto custom-scrollbar"
          style={{ borderLeft: `1px solid ${SIDEBAR.border}` }}
        >
          {accessControlMenuItems.map((item) => renderItem(item))}
        </div>
      )}
    </div>
  )
}
