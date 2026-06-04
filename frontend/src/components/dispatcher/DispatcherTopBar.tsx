'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Menu, Bell, Plus, User } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { getModuleByPath, getNavItem, LEGACY_DISPATCHER_REDIRECTS } from '@/lib/dispatcher/navigation'

function resolveTitle(pathname: string): string {
  if (pathname === '/dispatcher/profile') return 'Profile & Settings'

  const legacyTarget = LEGACY_DISPATCHER_REDIRECTS[pathname]
  if (legacyTarget) {
    const redirected = resolveTitle(legacyTarget)
    if (redirected !== 'Dispatcher Portal') return redirected
  }

  const module = getModuleByPath(pathname)
  if (!module) return 'Dispatcher Portal'

  const viewSlug = pathname.replace(module.basePath, '').replace(/^\//, '').split('/')[0]
  const view = viewSlug ? getNavItem(module, viewSlug) : undefined

  if (view) return `${module.label} · ${view.label}`
  return module.label
}

interface Props {
  onMenuClick?: () => void
}

export default function DispatcherTopBar({ onMenuClick }: Props) {
  const [time, setTime] = useState(new Date())
  const { user } = useAuth()
  const pathname = usePathname()
  const pageTitle = resolveTitle(pathname)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 gap-3 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <div className="min-w-0 hidden sm:block">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 leading-none mb-0.5">
              EADS · Dispatch
            </p>
            <h1 className="text-sm sm:text-base font-black text-gray-900 truncate">{pageTitle}</h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100/50 shadow-sm shrink-0">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </div>
            <span className="text-[10px] font-black tracking-widest text-emerald-600 uppercase">Live</span>
          </div>

          <div className="relative max-w-md w-full hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              type="text"
              placeholder="Search emergencies, patients..."
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500/10 focus:bg-white transition-all text-xs font-bold text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-red-600 text-sm sm:text-base font-bold font-mono tracking-wider leading-none">
              {format(time, 'HH:mm:ss')}
            </span>
            <span className="text-gray-400 text-[10px] font-medium mt-0.5">{format(time, 'EEE, dd MMM')}</span>
          </div>

          <button
            type="button"
            className="relative p-2 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              2
            </span>
          </button>

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-[11px] font-black tracking-wide uppercase text-gray-900 leading-none mb-0.5 truncate max-w-[120px]">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-red-600">Dispatcher</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20 border-2 border-white shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>

          <Link
            href="/dispatcher/operations/new-case"
            className="flex items-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-[10px] sm:text-xs shadow-md shadow-red-900/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">NEW EMERGENCY</span>
            <span className="sm:hidden">NEW</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
