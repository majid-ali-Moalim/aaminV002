'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { DriverNavModule } from '@/lib/driver/navigation'
import { moduleHref } from '@/lib/driver/navigation'

interface Props {
  module: DriverNavModule
  description?: string
  children: React.ReactNode
}

export default function DriverModuleShell({ module, description, children }: Props) {
  const pathname = usePathname()
  const showTabs = !module.singlePage && module.items.length > 1

  return (
    <div className="driver-module-shell">
      {description && <p className="driver-module-desc">{description}</p>}

      {showTabs && (
        <div className="driver-module-tabs-wrap">
          <nav className="driver-module-tabs" aria-label={`${module.label} views`}>
            {module.items.map((item) => {
              const href = moduleHref(module, item.slug)
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={item.slug}
                  href={href}
                  className={`driver-module-tab${active ? ' active' : ''}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}

      <div className="driver-module-body">{children}</div>
    </div>
  )
}

export function DriverPanel({
  title,
  children,
  empty,
}: {
  title?: string
  children?: React.ReactNode
  empty?: string
}) {
  return (
    <div className="driver-panel">
      {title && <div className="driver-panel-head">{title}</div>}
      <div className="driver-panel-body">
        {empty ? <p className="driver-panel-empty">{empty}</p> : children}
      </div>
    </div>
  )
}
