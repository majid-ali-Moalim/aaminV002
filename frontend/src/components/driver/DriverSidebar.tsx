'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { profilePhotoUrl, getEmployeeInitials } from '@/lib/profilePhoto'
import { DriverThemeToggle } from '@/components/driver/DriverThemeToggle'

function NavSection({ module }: { module: DriverNavModule }) {
  const pathname = usePathname()
  const { unreadCount } = useDriverStore()
  const isActive = isModulePathActive(pathname, module)
  const [open, setOpen] = useState(isActive || module.id === 'dashboard')
  const Icon = module.icon
  const isDashboard = module.id === 'dashboard'
  const isSingle = module.singlePage

  if (isDashboard || isSingle) {
    const href = isDashboard ? moduleHref(module, module.items[0].slug) : module.basePath
    const active = isModulePathActive(pathname, module)
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
  const photoSrc = profilePhotoUrl(profile?.profilePhoto)
  const initials = getEmployeeInitials(profile?.firstName, profile?.lastName)

  return (
    <aside className="driver-sidebar" aria-label="Driver panel navigation">
      <div className="driver-sidebar-brand">
        <div className="driver-sidebar-logo">
          <Radio className="driver-sidebar-logo-icon" size={20} />
        </div>
        <div className="driver-sidebar-brand-text">
          <span className="driver-sidebar-title">Driver Panel</span>
          <span className="driver-sidebar-sub">EADS · Field Ops</span>
        </div>
      </div>

      {profile && (
        <Link href="/driver/profile" className="driver-sidebar-user">
          <div className="driver-sidebar-avatar">
            {photoSrc ? (
              <Image
                src={photoSrc}
                alt={`${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() || 'Driver'}
                width={40}
                height={40}
                className="driver-sidebar-avatar-img"
                unoptimized
              />
            ) : (
              initials
            )}
          </div>
          <div className="driver-sidebar-user-info">
            <p className="driver-sidebar-user-name">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="driver-sidebar-user-role">
              {profile.employeeCode || 'Driver'} · {profile.shiftStatus?.replace(/_/g, ' ') || 'OFF DUTY'}
            </p>
          </div>
        </Link>
      )}

      <nav className="driver-sidebar-nav">
        {DRIVER_MODULES.map((mod) => (
          <NavSection key={mod.id} module={mod} />
        ))}
      </nav>

      <div className="driver-sidebar-footer">
        <DriverThemeToggle />
      </div>
    </aside>
  )
}
