'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, LayoutDashboard } from 'lucide-react'

export default function Breadcrumbs() {
  const pathname = usePathname()

  const pathSegments = pathname
    .split('/')
    .filter((segment) => segment !== '' && segment !== 'admin')

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')

  return (
    <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] font-bold uppercase tracking-wide text-admin-text-secondary">
      <Link
        href="/admin/dashboard"
        className="flex shrink-0 items-center gap-1.5 transition-colors hover:text-red-600 dark:hover:text-red-400"
      >
        <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
        <span className="whitespace-nowrap">Admin</span>
      </Link>

      {pathSegments.map((segment, index) => {
        const href = `/admin/${pathSegments.slice(0, index + 1).join('/')}`
        const isLast = index === pathSegments.length - 1

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 shrink-0 text-admin-text-muted" />
            <Link
              href={href}
              className={`truncate transition-colors ${
                isLast
                  ? 'font-black text-admin-text'
                  : 'hover:text-red-600 dark:hover:text-red-400'
              }`}
              title={capitalize(segment)}
            >
              {capitalize(segment)}
            </Link>
          </React.Fragment>
        )
      })}
    </nav>
  )
}
