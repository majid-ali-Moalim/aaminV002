'use client'

import { ReactNode, Suspense, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Building2, ChevronDown, LogOut } from 'lucide-react'
import {
  HOSPITAL_NAV_ITEMS,
  isHospitalNavActive,
  isHospitalNavChildActive,
} from '@/lib/hospital/navigation'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'

export function HospitalSidebar() {
  return (
    <Suspense fallback={<aside className="hosp-sidebar" />}>
      <HospitalSidebarInner />
    </Suspense>
  )
}

function HospitalSidebarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : ''
  const { logout } = useAuthStore()
  const unread = useNotificationStore((s) => s.stats?.unread ?? 0)
  const [casesOpen, setCasesOpen] = useState(pathname.startsWith('/hospital/emergency-cases'))

  return (
    <aside className="hosp-sidebar">
      <div className="hosp-sidebar-brand">
        <Building2 size={22} />
        <div>
          <p className="hosp-brand-title">Hospital Portal</p>
          <p className="hosp-brand-sub">EADS Coordination</p>
        </div>
      </div>
      <nav className="hosp-nav">
        {HOSPITAL_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isHospitalNavActive(pathname, item)
          const hasChildren = Boolean(item.children?.length)

          if (hasChildren) {
            return (
              <div key={item.id} className="hosp-nav-group">
                <button
                  type="button"
                  className={`hosp-nav-link${active ? ' active' : ''}`}
                  onClick={() => setCasesOpen((o) => !o)}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={14} className={`hosp-nav-chevron${casesOpen ? ' open' : ''}`} />
                </button>
                {casesOpen && (
                  <div className="hosp-nav-children">
                    {item.children!.map((child) => (
                      <Link
                        key={child.id}
                        href={child.href}
                        className={`hosp-nav-child${isHospitalNavChildActive(pathname, search, child) ? ' active' : ''}`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={`hosp-nav-link${active ? ' active' : ''}`}
            >
              <Icon size={18} />
              {item.label}
              {item.id === 'notifications' && unread > 0 && (
                <span className="hosp-nav-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
          )
        })}
      </nav>
      <button type="button" className="hosp-nav-link logout" onClick={logout}>
        <LogOut size={18} /> Sign out
      </button>
    </aside>
  )
}

export function HospitalPageLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="hosp-page">
      <header className="hosp-page-header">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </div>
  )
}
