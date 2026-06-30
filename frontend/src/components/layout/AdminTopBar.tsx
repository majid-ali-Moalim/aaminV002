'use client'

import { Search } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import Breadcrumbs from './Breadcrumbs'
import LiveActivityTicker from '../notifications/LiveActivityTicker'

function LiveSyncBadge() {
  return (
    <div className="admin-badge-live">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </div>
      <span className="text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
        Live Sync
      </span>
    </div>
  )
}

export default function AdminTopBar() {
  return (
    <header className="admin-topbar-surface sticky top-0 z-40 h-16 shadow-sm">
      <div className="flex h-full items-center gap-4 px-4 lg:px-6">
        <div className="min-w-0 shrink-0 max-w-[min(100%,220px)] sm:max-w-[280px]">
          <Breadcrumbs />
        </div>

        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <LiveSyncBadge />
          <div className="h-5 w-px shrink-0 bg-admin-border" />
          <div className="min-w-0 flex-1">
            <LiveActivityTicker />
          </div>
        </div>

        <div className="flex-1 lg:hidden" aria-hidden />

        <div className="flex shrink-0 items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted" />
            <input
              type="text"
              placeholder="Search..."
              className="admin-input w-44 py-2 pl-9 pr-3 text-xs xl:w-56"
            />
          </div>
          <div className="hidden h-8 w-px shrink-0 bg-admin-border md:block" />
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}
