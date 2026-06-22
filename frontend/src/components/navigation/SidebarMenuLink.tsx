'use client'

import { type LucideIcon } from 'lucide-react'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import { useOptimisticNav } from '@/lib/navigation/optimisticNav'

type SidebarPalette = {
  panel: string
  primary: string
  text: string
  secondary: string
  muted: string
}

interface SidebarMenuLinkProps {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  navKey?: string
  sidebar: SidebarPalette
  accentColor?: string
  className?: string
  iconClassName?: string
  onNavigate?: () => void
}

export default function SidebarMenuLink({
  href,
  label,
  icon: Icon,
  exact,
  navKey,
  sidebar: SIDEBAR,
  accentColor,
  className = 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium',
  iconClassName = 'w-4 h-4 shrink-0',
  onNavigate,
}: SidebarMenuLinkProps) {
  const { isActive } = useOptimisticNav()
  const key = navKey ?? `${label}-${href}`
  const active = isActive(key, href, exact)
  const iconColor = accentColor ?? SIDEBAR.muted

  return (
    <SidebarNavLink
      navKey={key}
      href={href}
      exact={exact}
      className={className}
      activeStyle={{ backgroundColor: SIDEBAR.primary, color: SIDEBAR.text, fontWeight: 600 }}
      inactiveStyle={{ color: SIDEBAR.secondary }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = SIDEBAR.panel
          e.currentTarget.style.color = SIDEBAR.text
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = SIDEBAR.secondary
        }
      }}
      onNavigate={onNavigate}
    >
      <Icon
        className={iconClassName}
        style={{ color: active ? SIDEBAR.text : iconColor }}
      />
      <span className="truncate leading-tight">{label}</span>
    </SidebarNavLink>
  )
}
