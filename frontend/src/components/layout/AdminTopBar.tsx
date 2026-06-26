'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, User } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import Breadcrumbs from './Breadcrumbs'
import LiveActivityTicker from '../notifications/LiveActivityTicker'
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { profilePhotoUrl } from '@/lib/profilePhoto'

export default function AdminTopBar() {
  const { user } = useAuth()
  const [photoError, setPhotoError] = useState(false)

  const firstName = user?.firstName || user?.employee?.firstName || ''
  const lastName = user?.lastName || user?.employee?.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.username || 'Admin User'
  const roleLabel = user?.employee?.employeeRole?.name || 'Administrator'
  const photoSrc = profilePhotoUrl(user?.employee?.profilePhoto)
  const showPhoto = Boolean(photoSrc) && !photoError

  useEffect(() => {
    setPhotoError(false)
  }, [user?.employee?.profilePhoto])

  return (
    <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 h-16 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-900/90">
      <div className="flex items-center justify-between h-full px-6 gap-8">
        <div className="flex items-center gap-8 min-w-0">
          <Breadcrumbs />
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/50 shadow-sm animate-in fade-in zoom-in duration-700">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Live Sync</span>
          </div>
          <div className="h-4 w-px bg-gray-200 hidden lg:block" />
          <LiveActivityTicker />
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="relative hidden md:block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Search..."
              className="w-48 xl:w-64 pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-red-500/10 focus:bg-white dark:focus:bg-slate-900 transition-all text-xs font-bold text-gray-900 dark:text-slate-100"
            />
          </div>

          <NotificationBell />

          <AdminThemeToggle compact />

          <div className="hidden sm:block text-right min-w-0 max-w-[160px]">
            <p className="text-[11px] font-black tracking-widest uppercase text-gray-900 dark:text-slate-100 leading-none mb-0.5 truncate">
              {fullName}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600 truncate">{roleLabel}</p>
          </div>

          <Link
            href="/admin/profile"
            className="shrink-0 group"
            aria-label={`${fullName} profile`}
            title={fullName}
          >
            <div className="w-10 h-10 rounded-2xl border-2 border-white shadow-lg shadow-red-900/20 overflow-hidden bg-red-600 ring-2 ring-red-600 group-hover:ring-red-700 transition-all">
              {showPhoto ? (
                <img
                  src={photoSrc}
                  alt={fullName}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
