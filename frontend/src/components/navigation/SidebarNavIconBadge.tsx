'use client'

import { type LucideIcon } from 'lucide-react'

export type NavBadgeVariant = 'green' | 'red'

const BADGE_BG: Record<NavBadgeVariant, string> = {
  green: 'bg-emerald-500 text-white',
  red: 'bg-red-600 text-white',
}

type IconProps = {
  icon: LucideIcon
  iconClassName?: string
  iconColor?: string
  className?: string
}

/** Nav row icon only (unread count goes at the back via NavUnreadCountBadge). */
export default function SidebarNavIconBadge({
  icon: Icon,
  iconClassName = 'w-4 h-4',
  iconColor,
  className = '',
}: IconProps) {
  return (
    <Icon
      className={`shrink-0 ${iconClassName} ${className}`.trim()}
      style={iconColor ? { color: iconColor } : undefined}
    />
  )
}

type CountProps = {
  count?: number
  variant?: NavBadgeVariant
  className?: string
}

/** Unread count pill at the back of a nav row (green = chat, red = notifications). */
export function NavUnreadCountBadge({
  count,
  variant = 'green',
  className = '',
}: CountProps) {
  if (count == null || count <= 0) return null

  return (
    <span
      className={`ml-auto shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${BADGE_BG[variant]} ${className}`.trim()}
      aria-label={`${count} unread`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

export function navBadgeClass(variant: NavBadgeVariant): string {
  return BADGE_BG[variant]
}
