'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  Search,
  Users,
  Phone,
  Stethoscope,
  MapPin,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { nursesService } from '@/lib/api'
import { Employee } from '@/types'

const ACTIVE_STATUSES = ['AVAILABLE', 'ON_DUTY', 'ON_BREAK']

function getStatusStyle(status?: string | null) {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'ON_DUTY':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'ON_BREAK':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export default function ActiveNursesPage() {
  const [nurses, setNurses] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true)
      const data = await nursesService.getAll()
      setNurses(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch active nurses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 15000)
    return () => clearInterval(interval)
  }, [])

  const activeNurses = useMemo(
    () => nurses.filter((n) => ACTIVE_STATUSES.includes(n.status || n.shiftStatus || '')),
    [nurses],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase()
    if (!q) return activeNurses
    return activeNurses.filter(
      (n) =>
        `${n.firstName || ''} ${n.lastName || ''}`.toLowerCase().includes(q) ||
        n.phone?.includes(q) ||
        n.employeeCode?.toLowerCase().includes(q) ||
        n.station?.name?.toLowerCase().includes(q),
    )
  }, [activeNurses, searchTerm])

  const stats = useMemo(
    () => ({
      total: activeNurses.length,
      onDuty: activeNurses.filter((n) => (n.status || n.shiftStatus) === 'ON_DUTY').length,
      available: activeNurses.filter((n) => (n.status || n.shiftStatus) === 'AVAILABLE').length,
      onBreak: activeNurses.filter((n) => (n.status || n.shiftStatus) === 'ON_BREAK').length,
    }),
    [activeNurses],
  )

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Live Roster
            </p>
            <h1 className="text-3xl font-black tracking-tight">Active Nurses</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Nurses currently on shift — available, on duty, or on break.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Total', value: stats.total, icon: Users, color: 'text-red-600 bg-red-50' },
          { label: 'On Duty', value: stats.onDuty, icon: Activity, color: 'text-blue-600 bg-blue-50' },
          { label: 'Available', value: stats.available, icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'On Break', value: stats.onBreak, icon: MapPin, color: 'text-amber-600 bg-amber-50' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${item.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nurse, code, or station…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
      </div>

      {loading && nurses.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading active nurses…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No active nurses</p>
          <p className="text-sm text-slate-500 mt-1">All nurses are currently off shift or unavailable</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((nurse) => {
            const name = `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim() || 'Unknown'
            const status = nurse.status || nurse.shiftStatus || 'UNKNOWN'
            const spec = (nurse as { specialization?: string }).specialization
            return (
              <div
                key={nurse.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-red-100 transition-all"
              >
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black truncate">{name}</p>
                    <p className="text-xs text-red-100 mt-0.5">{nurse.employeeCode || '—'}</p>
                    {spec && <p className="text-[10px] text-red-200 mt-1 uppercase tracking-wider">{spec}</p>}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${getStatusStyle(status)}`}
                  >
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="w-4 h-4 text-red-500 shrink-0" />
                    {nurse.phone || 'No phone'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                    {nurse.station?.name || 'Unassigned station'}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Stethoscope className="w-4 h-4 text-red-500 shrink-0" />
                    {nurse.assignedAmbulance?.ambulanceNumber || 'No unit assigned'}
                  </div>
                  <Link href="/admin/nurses/patient-care">
                    <Button variant="outline" size="sm" className="w-full rounded-xl mt-2">
                      View Patient Care
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
