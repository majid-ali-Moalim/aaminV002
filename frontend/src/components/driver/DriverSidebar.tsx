'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Radio } from 'lucide-react'
import {
  DRIVER_MODULES,
  isModulePathActive,
  isViewActive,
  moduleHref,
  type DriverNavModule,
} from '@/lib/driver/navigation'
import { useDriverStore } from '@/lib/stores/driverStore'

function NavSection({ module }: { module: DriverNavModule }) {
  const pathname = usePathname()
  const { unreadCount } = useDriverStore()
  const isActive = isModulePathActive(pathname, module)
  const [open, setOpen] = useState(isActive || module.id === 'dashboard')
  const Icon = module.icon
  const isDashboard = module.id === 'dashboard'
  const isSingle = module.singlePage && module.items.length === 1

  if (isDashboard || isSingle) {
    const item = module.items[0]
    const href = moduleHref(module, item.slug)
    const active = isViewActive(pathname, module, item.slug)
    const showBadge = module.id === 'notifications' && unreadCount > 0
    return (
      <Link href={href} className={`driver-sidebar-link driver-sidebar-link--top${active ? ' active' : ''}`}>
        <Icon size={18} className="driver-sidebar-link-icon" />
        <span className="driver-sidebar-link-label">{module.label}</span>
        {showBadge && (
          <span className="driver-sidebar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </Link>
    )
  }

  return (
    <div className="driver-sidebar-section">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`driver-sidebar-section-btn${isActive ? ' active' : ''}`}
      >
        <div className="driver-sidebar-section-left">
          <Icon size={16} />
          <span>{module.label}</span>
        </div>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="driver-sidebar-subnav">
          {module.items.map((item) => {
            const href = moduleHref(module, item.slug)
            const active = isViewActive(pathname, module, item.slug)
            const ItemIcon = item.icon
            return (
              <Link
                key={item.slug}
                href={href}
                className={`driver-sidebar-sublink${active ? ' active' : ''}`}
              >
                <ItemIcon size={14} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DriverSidebar() {
  const { profile } = useDriverStore()

  return (
    <aside className="driver-sidebar" aria-label="Driver panel navigation">
      <div className="driver-sidebar-brand">
        <div className="driver-sidebar-logo">
          <Radio className="driver-sidebar-logo-icon" size={20} />
        </div>
        <div className="driver-sidebar-brand-text">
          <span className="driver-sidebar-title">🚑 Driver Panel</span>
          <span className="driver-sidebar-sub">EADS · Field Ops</span>
        </div>
      </div>

      {profile && (
        <div className="driver-sidebar-user">
          <div className="driver-sidebar-avatar">
            {profile.firstName?.[0]}
            {profile.lastName?.[0]}
          </div>
          <div className="driver-sidebar-user-info">
            <p className="driver-sidebar-user-name">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="driver-sidebar-user-role">
              {profile.employeeCode || 'Driver'} · {profile.shiftStatus?.replace(/_/g, ' ') || 'OFF DUTY'}
            </p>
          </div>
        </div>
      )}

      <nav className="driver-sidebar-nav">
        {DRIVER_MODULES.map((mod) => (
          <NavSection key={mod.id} module={mod} />
        ))}
      </nav>
    </aside>
  )
}
