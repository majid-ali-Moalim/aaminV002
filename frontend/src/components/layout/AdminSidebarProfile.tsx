'use client'

import Link from 'next/link'
import AaminLogo from '@/components/brand/AaminLogo'

export default function AdminSidebarProfile() {
  return (
    <Link
      href="/admin/dashboard"
      className="flex h-16 items-center gap-3 px-4 shrink-0"
      style={{
        backgroundColor: 'hsl(var(--sidebar-bg))',
        borderBottom: '1px solid hsl(var(--sidebar-border))',
      }}
    >
      <AaminLogo size="sm" priority onDark />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-black" style={{ color: 'hsl(var(--sidebar-text))' }}>
          Aamin Ambulance
        </p>
        <p
          className="truncate text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'hsl(var(--sidebar-muted))' }}
        >
          Ambulance Services
        </p>
      </div>
    </Link>
  )
}
