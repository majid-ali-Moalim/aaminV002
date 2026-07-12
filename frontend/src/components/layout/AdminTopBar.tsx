'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { profilePhotoUrl } from '@/lib/profilePhoto'
import NotificationBell from '../notifications/NotificationBell'
import Breadcrumbs from './Breadcrumbs'
import LiveActivityTicker from '../notifications/LiveActivityTicker'
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle'

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

function AdminProfileMenu() {
  const { user, logout } = useAuth()
  const [photoError, setPhotoError] = useState(false)

  const firstName = user?.firstName || user?.employee?.firstName || ''
  const lastName = user?.lastName || user?.employee?.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.username || 'Admin User'
  const roleLabel = user?.employee?.employeeRole?.name || 'Administrator'
  const photoSrc = profilePhotoUrl(user?.employee?.profilePhoto)
  const showPhoto = Boolean(photoSrc) && !photoError
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    setPhotoError(false)
  }, [user?.employee?.profilePhoto])

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/admin/profile"
        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-admin-hover"
        title={fullName}
      >
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-red-600 ring-2 ring-red-500/60">
          {showPhoto ? (
            <img
              src={photoSrc}
              alt={fullName}
              className="h-full w-full object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-black text-white">
              {initials || <User className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className="max-w-[140px] truncate text-sm font-bold text-admin-text">{fullName}</p>
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-red-500">
            {roleLabel}
          </p>
        </div>
      </Link>
      <AdminThemeToggle compact />
      <button
        type="button"
        onClick={() => logout()}
        className="flex items-center rounded-xl px-2.5 py-2 text-admin-text-muted transition-colors hover:bg-admin-hover hover:text-red-600"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
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

        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          <div className="h-8 w-px shrink-0 bg-admin-border" />
          <AdminProfileMenu />
        </div>
      </div>
    </header>
  )
}
