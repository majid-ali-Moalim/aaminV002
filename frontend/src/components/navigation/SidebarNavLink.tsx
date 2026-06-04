'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useTransition,
} from 'react'
import { useOptimisticNav } from '@/lib/navigation/optimisticNav'

interface SidebarNavLinkProps {
  navKey: string
  href: string
  exact?: boolean
  className?: string
  activeStyle?: CSSProperties
  inactiveStyle?: CSSProperties
  onNavigate?: () => void
  onMouseEnter?: (e: MouseEvent<HTMLAnchorElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLAnchorElement>) => void
  children: ReactNode
}

export default function SidebarNavLink({
  navKey,
  href,
  exact,
  className = '',
  activeStyle,
  inactiveStyle,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
  children,
}: SidebarNavLinkProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const { setPending, isActive } = useOptimisticNav()
  const active = isActive(navKey, href, exact)

  const prefetch = () => {
    router.prefetch(href)
  }

  return (
    <Link
      href={href}
      prefetch
      className={className}
      style={active ? activeStyle : inactiveStyle}
      onClick={(e) => {
        e.preventDefault()
        setPending(navKey, href)
        onNavigate?.()
        startTransition(() => {
          router.push(href)
        })
      }}
      onMouseEnter={(e) => {
        prefetch()
        onMouseEnter?.(e)
      }}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Link>
  )
}
