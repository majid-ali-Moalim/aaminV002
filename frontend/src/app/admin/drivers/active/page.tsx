'use client'

import { useMemo, useState } from 'react'
import { displayAttendanceFlag } from '@/lib/availability/labels'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Search,
  Users,
  Truck,
  MapPin,
  Loader2,
  RefreshCw,
  User,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { driversService } from '@/lib/api'
import type { DriverAvailabilityRow } from '@/lib/drivers/availability'
import { buildStaffChatUrl } from '@/lib/staffChat'

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function ActiveDriversPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, isValidating, mutate } = useSWR(
    'driver-availability-active',
    () => driversService.getAvailabilityOverview(),
    { refreshInterval: 15000 },
  )

  const onCaseDrivers = useMemo(
    () => (data?.drivers ?? []).filter((d) => d.currentCase),
    [data?.drivers],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return onCaseDrivers
    return onCaseDrivers.filter((d) =>
      [d.fullName, d.employeeCode ?? '', d.phone ?? '', d.currentCase?.trackingCode ?? '', d.currentCase?.patientName ?? '', d.currentCase?.ambulanceNumber ?? ''].join(' ').toLowerCase().includes(q),
    )
  }, [onCaseDrivers, searchTerm])

  const openChat = (row: DriverAvailabilityRow) => {
    if (!row.userId || !row.currentCase) return
    router.push(buildStaffChatUrl({ userId: row.userId, caseId: row.currentCase.id, trackingCode: row.currentCase.trackingCode }))
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">Live Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Active Drivers on Case</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Drivers currently assigned to active emergency cases — patient, ambulance, and case details in one view.
            </p>
          </div>
          <Button variant="outline" onClick={() => mutate()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20 shrink-0">
            <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">On Active Case</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{onCaseDrivers.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Today</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{(data?.drivers ?? []).filter((d) => d.attendanceStatus === 'present').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Drivers</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{data?.summary.total ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search driver, case, patient, or ambulance…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-red-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading active drivers…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No drivers on active cases</p>
          <p className="text-sm text-slate-500 mt-1">Drivers appear here when assigned to a live emergency case</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((driver) => {
            const c = driver.currentCase!
            return (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 text-white flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-lg">{driver.fullName}</p>
                    <p className="text-xs text-red-100">{driver.employeeCode ?? '—'} · {driver.phone ?? 'No phone'}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${driver.attendanceStatus === 'present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {displayAttendanceFlag(driver.attendanceStatus === 'present')}
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Case</p>
                      <span className="text-[10px] font-bold uppercase text-blue-600">{statusLabel(c.status)}</span>
                    </div>
                    <Link href={`/admin/emergency-requests/${c.id}`} className="text-lg font-black text-red-600 hover:underline inline-flex items-center gap-1">
                      {c.trackingCode} <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 text-slate-700">
                      <User className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Patient</p><p className="font-semibold">{c.patientName ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <Truck className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Ambulance</p><p className="font-semibold">{c.ambulanceNumber ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Station</p><p className="font-semibold">{driver.station?.name ?? 'Unassigned'}</p></div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/admin/emergency-requests/${c.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-xl">View Case</Button>
                    </Link>
                    {driver.userId && (
                      <Button onClick={() => openChat(driver)} className="rounded-xl bg-blue-600 hover:bg-blue-700">
                        <MessageSquare className="w-4 h-4 mr-2" /> Message
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
