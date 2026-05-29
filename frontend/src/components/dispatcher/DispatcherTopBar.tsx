'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Menu, Bell, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/context/AuthContext'

export default function DispatcherTopBar() {
  const [time, setTime] = useState(new Date())
  const { user } = useAuth()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="bg-[#0B0F19] border-b border-[#1F2937] h-20 sticky top-0 z-40 flex items-center justify-between px-6">
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <button type="button" className="text-[#9CA3AF] hover:text-white transition-colors lg:hidden">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search emergencies, patients..."
            className="w-full bg-[#111827] border border-[#1F2937] text-white text-sm rounded-xl pl-11 pr-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] placeholder-[#6B7280]"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[#3B82F6] text-lg font-bold font-mono tracking-wider leading-none">
            {format(time, 'HH:mm:ss')}
          </span>
          <span className="text-[#6B7280] text-xs font-medium mt-1">{format(time, 'EEE, dd MMM yyyy')}</span>
        </div>

        <button
          type="button"
          className="relative p-2 text-[#9CA3AF] hover:text-white bg-[#111827] rounded-xl border border-[#1F2937]"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0B0F19]">
            2
          </span>
        </button>

        <div className="hidden sm:block text-right mr-1">
          <p className="text-xs font-bold text-white leading-none">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-[10px] text-[#EF4444] font-bold uppercase mt-0.5">Dispatcher</p>
        </div>

        <Link
          href="/dispatcher/emergencies"
          className="flex items-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          NEW EMERGENCY
        </Link>
      </div>
    </header>
  )
}
