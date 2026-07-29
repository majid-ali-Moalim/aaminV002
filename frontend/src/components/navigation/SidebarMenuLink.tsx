'use client'

import { type LucideIcon } from 'lucide-react'
import SidebarNavLink from '@/components/navigation/SidebarNavLink'
import SidebarNavIconBadge, { NavUnreadCountBadge } from '@/components/navigation/SidebarNavIconBadge'
import { useOptimisticNav } from '@/lib/navigation/optimisticNav'

type SidebarPalette = {
  panel: string
  primary: string
  text: string
  textActive?: string
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
  badge?: number
  /** Green for messages/communication; red for alerts/notifications */
  badgeVariant?: 'green' | 'red'
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
  badge,
  badgeVariant = 'green',
}: SidebarMenuLinkProps) {
  const { isActive } = useOptimisticNav()
  const key = navKey ?? `${label}-${href}`
  const active = isActive(key, href, exact)
  const iconColor = accentColor ?? SIDEBAR.muted
  const activeTextColor = SIDEBAR.textActive ?? SIDEBAR.text

  return (
    <SidebarNavLink
      navKey={key}
      href={href}
      exact={exact}
      className={className}
      activeStyle={{ backgroundColor: SIDEBAR.primary, color: activeTextColor, fontWeight: 600 }}
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
      <SidebarNavIconBadge
        icon={Icon}
        iconClassName={iconClassName}
        iconColor={active ? activeTextColor : iconColor}
      />
      <span className="truncate leading-tight flex-1">{label}</span>
      <NavUnreadCountBadge count={badge} variant={badgeVariant} />
    </SidebarNavLink>
  )
}
