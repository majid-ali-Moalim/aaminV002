'use client'

import { useMemo, useState } from 'react'
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
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { nursesService } from '@/lib/api'
import type { NurseAvailabilityRow } from '@/lib/nurses/availability'
import { buildStaffChatUrl } from '@/lib/staffChat'

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function ActiveNursesPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  const { data, isLoading, isValidating, mutate } = useSWR(
    'nurse-availability-active',
    () => nursesService.getAvailabilityOverview(),
    { refreshInterval: 15000 },
  )

  const onCaseNurses = useMemo(
    () => (data?.nurses ?? []).filter((n) => n.currentCase),
    [data?.nurses],
  )

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return onCaseNurses
    return onCaseNurses.filter((n) =>
      [n.fullName, n.employeeCode ?? '', n.phone ?? '', n.specialization ?? '', n.currentCase?.trackingCode ?? '', n.currentCase?.patientName ?? '', n.currentCase?.ambulanceNumber ?? ''].join(' ').toLowerCase().includes(q),
    )
  }, [onCaseNurses, searchTerm])

  const openChat = (row: NurseAvailabilityRow) => {
    if (!row.userId || !row.currentCase) return
    router.push(buildStaffChatUrl({ userId: row.userId, caseId: row.currentCase.id, trackingCode: row.currentCase.trackingCode }))
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Activity className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-200 mb-2">Live Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Active Nurses on Case</h1>
            <p className="text-violet-100/80 mt-2 max-w-xl text-sm">
              Nurses currently assigned to active emergency cases — patient, ambulance, and case details in one view.
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
          <p className="text-3xl font-black text-slate-900 mt-1">{onCaseNurses.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present Today</p>
          <p className="text-3xl font-black text-emerald-600 mt-1">{(data?.nurses ?? []).filter((n) => n.attendanceStatus === 'present').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Nurses</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{data?.summary.total ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nurse, case, patient, or ambulance…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-24 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-violet-500 mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading active nurses…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No nurses on active cases</p>
          <p className="text-sm text-slate-500 mt-1">Nurses appear here when assigned to a live emergency case</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((nurse) => {
            const c = nurse.currentCase!
            return (
              <div key={nurse.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-5 py-4 text-white flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-lg">{nurse.fullName}</p>
                    <p className="text-xs text-violet-100">{nurse.employeeCode ?? '—'} · {nurse.specialization ?? 'Nurse'}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${nurse.attendanceStatus === 'present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {nurse.attendanceStatus === 'present' ? 'Present' : 'Absent'}
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Case</p>
                      <span className="text-[10px] font-bold uppercase text-blue-600">{statusLabel(c.status)}</span>
                    </div>
                    <Link href={`/admin/emergency-requests/${c.id}`} className="text-lg font-black text-violet-600 hover:underline inline-flex items-center gap-1">
                      {c.trackingCode} <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2 text-slate-700">
                      <User className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Patient</p><p className="font-semibold">{c.patientName ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <Truck className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Ambulance</p><p className="font-semibold">{c.ambulanceNumber ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <Stethoscope className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Specialization</p><p className="font-semibold">{nurse.specialization ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase">Station</p><p className="font-semibold">{nurse.station?.name ?? 'Unassigned'}</p></div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link href={`/admin/emergency-requests/${c.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-xl">View Case</Button>
                    </Link>
                    {nurse.userId && (
                      <Button onClick={() => openChat(nurse)} className="rounded-xl bg-blue-600 hover:bg-blue-700">
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
