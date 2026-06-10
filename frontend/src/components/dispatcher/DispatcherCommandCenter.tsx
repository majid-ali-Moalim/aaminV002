'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  RefreshCw,
  Loader2,
  Play,
  Square,
  Siren,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
  Radio,
  Users,
  Building2,
  Bell,
  Activity,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import AssignModal from '@/components/features/emergency/AssignModal'
import toast from 'react-hot-toast'

type Overview = Awaited<ReturnType<typeof dispatcherDashboardApi.getOverview>>

const TOP_STATS = [
  { key: 'liveEmergencyCases', label: 'Active Emergencies', icon: Siren, color: 'text-red-600', href: '/dispatcher/emergency/active' },
  { key: 'busyAmbulances', label: 'Active Ambulances', icon: Truck, color: 'text-amber-600', href: '/dispatcher/resources/ambulances' },
  { key: 'availableAmbulances', label: 'Available Ambulances', icon: Truck, color: 'text-emerald-600', href: '/dispatcher/resources/availability' },
  { key: 'criticalCases', label: 'Critical Cases', icon: AlertTriangle, color: 'text-red-700', href: '/dispatcher/emergency/critical' },
  { key: 'pendingDispatches', label: 'Pending Dispatches', icon: Clock, color: 'text-orange-600', href: '/dispatcher/emergency/pending' },
  { key: 'delayedMissions', label: 'Delayed Missions', icon: AlertTriangle, color: 'text-amber-700', href: '/dispatcher/monitoring/incidents' },
  { key: 'todayCompletedMissions', label: "Today's Missions", icon: CheckCircle2, color: 'text-emerald-700', href: '/dispatcher/emergency/closed' },
  { key: 'averageResponseTimeMinutes', label: 'Avg Response Time', icon: Timer, color: 'text-violet-600', suffix: ' min', href: '/dispatcher/reports/performance' },
] as const

function MiniCase({ item }: { item: any }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex justify-between gap-2">
        <span className="font-bold text-sm text-gray-900">{item.trackingCode}</span>
        <span className="text-[10px] font-bold text-red-600">{item.priority}</span>
      </div>
      <p className="text-xs text-gray-500 truncate">{item.patient?.fullName}</p>
      <span className="text-[10px] uppercase font-bold text-gray-400">{item.status}</span>
    </div>
  )
}

export default function DispatcherCommandCenter() {
  const { profile, loading: authLoading, canOperate, shiftStatus, refresh: refreshAccess } =
    useDispatcherAccess()
  const [shiftBusy, setShiftBusy] = useState(false)
  const [assignTarget, setAssignTarget] = useState<any>(null)

  const { data, isLoading, mutate, isValidating } = useSWR<Overview>(
    'dispatcher-dashboard-overview',
    () => dispatcherDashboardApi.getOverview(),
    { refreshInterval: 12000 },
  )

  const handleRefresh = useCallback(async () => {
    await Promise.all([mutate(), refreshAccess()])
  }, [mutate, refreshAccess])

  const handleStartShift = async () => {
    setShiftBusy(true)
    try {
      await dispatcherDashboardApi.startShift()
      toast.success('Shift started')
      await handleRefresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not start shift')
    } finally {
      setShiftBusy(false)
    }
  }

  const handleEndShift = async () => {
    setShiftBusy(true)
    try {
      await dispatcherDashboardApi.endShift()
      toast.success('Shift ended')
      await handleRefresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not end shift')
    } finally {
      setShiftBusy(false)
    }
  }

  if ((authLoading && !profile) || (isLoading && !data)) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  const o = data!
  const kpis = o.kpis
  const crew = (o as any).crewStatus

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational command center · {profile?.firstName || 'Dispatcher'}
            {o.station && <span className="text-red-600 font-semibold"> · {o.station}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            {isValidating ? 'Syncing…' : 'Live'}
          </span>
          {!canOperate ? (
            <Button onClick={handleStartShift} disabled={shiftBusy} className="bg-red-600 hover:bg-red-700 rounded-xl h-9 font-bold">
              {shiftBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Start Shift
            </Button>
          ) : (
            <Button onClick={handleEndShift} disabled={shiftBusy} variant="outline" className="rounded-xl h-9">
              <Square className="w-4 h-4 mr-2" />
              End · {shiftStatus}
            </Button>
          )}
          <button type="button" onClick={handleRefresh} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium shadow-sm">
            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
        {TOP_STATS.map((s) => {
          const raw = kpis[s.key as keyof typeof kpis]
          const val = s.key === 'averageResponseTimeMinutes' ? (raw != null ? `${raw}${s.suffix ?? ''}` : '—') : raw
          const Icon = s.icon
          return (
            <Link key={s.key} href={s.href} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:border-red-200 hover:shadow transition-all">
              <Icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className="text-lg sm:text-xl font-black text-gray-900 leading-none">{val}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase mt-1 leading-tight">{s.label}</p>
            </Link>
          )
        })}
      </div>

      {/* 3-column command layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Center Panel — 8 cols */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-700 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-600" />
                Live Dispatch Board
              </h2>
              <Link href="/dispatcher/emergency/pending" className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                Full board <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto custom-scrollbar">
              {o.pendingQueue.length === 0 && o.activeMissions.length === 0 ? (
                <p className="text-sm text-gray-400 col-span-2 text-center py-8">No active dispatch activity</p>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-orange-600 mb-2">Pending ({o.pendingQueue.length})</p>
                    {o.pendingQueue.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex justify-between items-start py-2 border-b border-gray-50">
                        <MiniCase item={c} />
                        {canOperate && (
                          <button type="button" onClick={() => setAssignTarget(c)} className="text-[10px] font-bold text-red-600 shrink-0 ml-2">
                            Assign
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-blue-600 mb-2">Active ({o.activeMissions.length})</p>
                    {o.activeMissions.slice(0, 5).map((c) => (
                      <MiniCase key={c.id} item={c} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-3">Active Mission Queue</h3>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {o.activeMissions.slice(0, 8).map((c) => (
                  <MiniCase key={c.id} item={c} />
                ))}
                {!o.activeMissions.length && <p className="text-sm text-gray-400 text-center py-6">No active missions</p>}
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-700 mb-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Critical Alerts
              </h3>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {o.criticalCases.slice(0, 6).map((c) => (
                  <MiniCase key={c.id} item={c} />
                ))}
                {!o.criticalCases.length && <p className="text-sm text-red-400/80 text-center py-6">No critical alerts</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel — 4 cols */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-2">Recent Emergencies</h3>
            <div className="max-h-40 overflow-y-auto custom-scrollbar">
              {o.liveCases.slice(0, 6).map((c) => (
                <MiniCase key={c.id} item={c} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-600" /> Crew Status
            </h3>
            {crew ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-black text-gray-900">{crew.driversAvailable}/{crew.driversTotal}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Drivers ready</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-black text-gray-900">{crew.nursesAvailable}/{crew.nursesTotal}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Nurses ready</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading crew…</p>
            )}
            <Link href="/dispatcher/resources/availability" className="text-[10px] font-bold text-red-600 mt-2 inline-block">
              Manage resources →
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Hospital Capacity
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {o.hospitalCapacity.slice(0, 4).map((h) => (
                <div key={h.id} className="flex justify-between text-xs">
                  <span className="font-bold text-gray-800 truncate pr-2">{h.name}</span>
                  <span className={`font-bold shrink-0 ${h.status === 'Available' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Notifications
            </h3>
            <p className="text-sm text-gray-600">
              <span className="font-black text-red-600">{kpis.pendingDispatches}</span> pending ·{' '}
              <span className="font-black text-amber-600">{kpis.delayedMissions}</span> delayed
            </p>
            <Link href="/dispatcher/alerts/all" className="text-[10px] font-bold text-red-600 mt-2 inline-block">
              View all alerts →
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-700 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> Activity Feed
            </h3>
            <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-2">
              {o.activityFeed.slice(0, 8).map((a) => (
                <div key={a.id} className="text-xs border-b border-gray-50 pb-1.5">
                  <span className="font-bold text-gray-800">{a.title}</span>
                  <span className="text-gray-500 block truncate">{a.message}</span>
                  <span className="text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Extended KPI sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { title: 'Live Emergency Cases', data: o.liveCases, href: '/dispatcher/emergency/all' },
          { title: 'Delayed Missions', data: o.delayedMissions, href: '/dispatcher/monitoring/incidents' },
          { title: 'Hospital Capacity Snapshot', data: o.hospitalCapacity, href: '/dispatcher/hospital/availability', isHospital: true },
        ].map((section) => (
          <div key={section.title} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-700">{section.title}</h3>
              <Link href={section.href} className="text-[10px] font-bold text-red-600">View →</Link>
            </div>
            {(section as any).isHospital
              ? o.hospitalCapacity.slice(0, 5).map((h) => (
                  <div key={h.id} className="flex justify-between py-1.5 text-sm border-b border-gray-50">
                    <span className="font-medium truncate">{h.name}</span>
                    <span className="text-gray-500 shrink-0 ml-2">{h.beds} beds</span>
                  </div>
                ))
              : (section.data as any[]).slice(0, 5).map((c) => <MiniCase key={c.id} item={c} />)}
          </div>
        ))}
      </div>

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => {
            setAssignTarget(null)
            toast.success('Unit assigned')
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}
