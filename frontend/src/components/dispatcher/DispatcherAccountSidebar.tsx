'use client'

import SidebarMenuLink from '@/components/navigation/SidebarMenuLink'
import { DISPATCHER_ACCOUNT_ITEMS } from '@/lib/dispatcher/accountNav'

const SIDEBAR = {
  bg: '#0B1220',
  panel: '#111827',
  primary: '#EF2D2D',
  text: '#FFFFFF',
  secondary: '#94A3B8',
  muted: '#64748B',
  border: 'rgba(255,255,255,0.06)',
} as const

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="pt-4 pb-1.5 px-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: SIDEBAR.muted }}>
        {label}
      </span>
    </div>
  )
}

interface Props {
  onNavigate?: () => void
}

export default function DispatcherAccountSidebar({ onNavigate }: Props) {
  return (
    <div>
      <SectionLabel label="Account" />
      <div className="space-y-0.5 px-0.5">
        {DISPATCHER_ACCOUNT_ITEMS.map((item) => (
          <SidebarMenuLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            exact={item.exact}
            sidebar={SIDEBAR}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium"
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}
