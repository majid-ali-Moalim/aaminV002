'use client'

import { useCallback, useMemo, useState } from 'react'
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
  Radio,
  Users,
  Stethoscope,
  ChevronRight,
  Plus,
  Activity,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import AssignModal from '@/components/features/emergency/AssignModal'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import { isActiveOngoingCase } from '@/lib/emergency/dateFilters'
import type { EmergencyRequest } from '@/types'
import toast from 'react-hot-toast'

type Overview = Awaited<ReturnType<typeof dispatcherDashboardApi.getOverview>>

const LINKS = {
  pending: '/dispatcher/emergency-requests/pending',
  delayed: '/dispatcher/emergency-requests/escalated',
  critical: '/dispatcher/emergency-requests/critical',
  active: '/dispatcher/emergency-requests/active',
  ambulances: '/dispatcher/resources',
  drivers: '/dispatcher/resources',
  nurses: '/dispatcher/resources',
  newCase: '/dispatcher/emergency-requests/new',
} as const

type StatCardConfig = {
  key: string
  label: string
  hint: string
  href: string
  icon: typeof Siren
  accent: string
  iconBg: string
  value: number | string
}

function CaseRow({
  item,
  onAssign,
  canAssign,
}: {
  item: EmergencyRequest
  onAssign?: () => void
  canAssign?: boolean
}) {
  const patient = item.patient?.fullName || item.callerName || 'Unknown'
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-mono text-xs font-black text-red-600">{item.trackingCode}</span>
          <PriorityBadge priority={item.priority} size="sm" />
          <StatusBadge status={item.status} size="sm" />
        </div>
        <p className="text-sm font-semibold text-slate-800 truncate">{patient}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{item.pickupLocation}</p>
      </div>
      {canAssign && onAssign && (
        <button
          type="button"
          onClick={onAssign}
          className="shrink-0 text-[10px] font-black uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg"
        >
          Assign
        </button>
      )}
    </div>
  )
}

function StatCard({ card }: { card: StatCardConfig }) {
  const Icon = card.icon
  return (
    <Link
      href={card.href}
      className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${card.accent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 leading-none">{card.value}</p>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-700 mt-2">{card.label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{card.hint}</p>
    </Link>
  )
}

export default function DispatcherCommandCenter() {
  const { profile, loading: authLoading, canOperate, shiftStatus, refresh: refreshAccess } =
    useDispatcherAccess()
  const [shiftBusy, setShiftBusy] = useState(false)
  const [assignTarget, setAssignTarget] = useState<EmergencyRequest | null>(null)

  const { data, error, isLoading, mutate, isValidating } = useSWR<Overview>(
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Could not start shift')
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
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast.error(error?.response?.data?.message || 'Could not end shift')
    } finally {
      setShiftBusy(false)
    }
  }

  const stats = useMemo(() => {
    if (!data) return null
    const kpis = data.kpis ?? {}
    const crew = (data as { crewStatus?: { driversAvailable: number; nursesAvailable: number } })
      .crewStatus
    const activeMissions = (data.activeMissions ?? []) as EmergencyRequest[]
    const activeWithCrew = activeMissions.filter(isActiveOngoingCase).length

    return {
      pending: kpis.pendingDispatches ?? 0,
      delayed: kpis.delayedMissions ?? 0,
      critical: kpis.criticalCases ?? 0,
      active: activeWithCrew,
      ambulances: kpis.availableAmbulances ?? 0,
      drivers: crew?.driversAvailable ?? 0,
      nurses: crew?.nursesAvailable ?? 0,
    }
  }, [data])

  const statCards = useMemo((): StatCardConfig[] => {
    if (!stats) return []
    return [
      {
        key: 'pending',
        label: 'Pending Cases',
        hint: 'Awaiting triage or assignment',
        href: LINKS.pending,
        icon: Clock,
        accent: 'border-orange-200 hover:border-orange-300',
        iconBg: 'bg-orange-100 text-orange-600',
        value: stats.pending,
      },
      {
        key: 'delayed',
        label: 'Delay Cases',
        hint: 'Past response-time threshold',
        href: LINKS.delayed,
        icon: AlertTriangle,
        accent: 'border-amber-200 hover:border-amber-300',
        iconBg: 'bg-amber-100 text-amber-700',
        value: stats.delayed,
      },
      {
        key: 'critical',
        label: 'Critical Cases',
        hint: 'Priority 1 — immediate attention',
        href: LINKS.critical,
        icon: Siren,
        accent: 'border-red-200 hover:border-red-300',
        iconBg: 'bg-red-100 text-red-600',
        value: stats.critical,
      },
      {
        key: 'active',
        label: 'Active Cases',
        hint: 'Assigned crew & in progress',
        href: LINKS.active,
        icon: Radio,
        accent: 'border-blue-200 hover:border-blue-300',
        iconBg: 'bg-blue-100 text-blue-600',
        value: stats.active,
      },
      {
        key: 'ambulances',
        label: 'Available Ambulances',
        hint: 'Ready to dispatch now',
        href: LINKS.ambulances,
        icon: Truck,
        accent: 'border-emerald-200 hover:border-emerald-300',
        iconBg: 'bg-emerald-100 text-emerald-600',
        value: stats.ambulances,
      },
      {
        key: 'nurses',
        label: 'Available Nurses',
        hint: 'On shift and ready',
        href: LINKS.nurses,
        icon: Stethoscope,
        accent: 'border-violet-200 hover:border-violet-300',
        iconBg: 'bg-violet-100 text-violet-600',
        value: stats.nurses,
      },
      {
        key: 'drivers',
        label: 'Available Drivers',
        hint: 'On shift and ready',
        href: LINKS.drivers,
        icon: UserCheck,
        accent: 'border-cyan-200 hover:border-cyan-300',
        iconBg: 'bg-cyan-100 text-cyan-600',
        value: stats.drivers,
      },
    ]
  }, [stats])

  if (authLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your dispatch profile…</p>
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your dispatch overview…</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4 px-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-600" />
        <div>
          <p className="text-base font-bold text-slate-800">Could not load dispatch overview</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
              || (error instanceof Error ? error.message : null)
              || 'The dashboard API did not return data. Check that the backend is running and you are signed in as a dispatcher.'}
          </p>
        </div>
        <Button onClick={() => void handleRefresh()} className="rounded-xl">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const o = data
  const pendingQueue = (o.pendingQueue ?? []) as EmergencyRequest[]
  const activeMissions = (o.activeMissions ?? []) as EmergencyRequest[]
  const criticalCases = (o.criticalCases ?? []) as EmergencyRequest[]
  const activityFeed = o.activityFeed ?? []

  return (
    <div className="space-y-6 pb-10">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Dispatch Operations
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome back, {profile?.firstName || 'Dispatcher'}
            </h1>
            <p className="text-red-100/90 mt-2 text-sm max-w-xl">
              {o.station && <span className="font-semibold">{o.station}</span>}
              {(o as { scope?: { region?: string } }).scope?.region && (
                <span>
                  {o.station ? ' · ' : ''}
                  {(o as { scope?: { region?: string } }).scope?.region}
                </span>
              )}
              {!o.station && !(o as { scope?: { region?: string } }).scope?.region && (
                <>Your live command center — cases, crew, and resources at a glance.</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {isValidating ? 'Syncing…' : 'Live'}
            </span>
            {!canOperate ? (
              <Button
                onClick={handleStartShift}
                disabled={shiftBusy}
                className="bg-white text-red-700 hover:bg-red-50 rounded-xl h-10 font-bold shadow-sm"
              >
                {shiftBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Start Shift
              </Button>
            ) : (
              <Button
                onClick={handleEndShift}
                disabled={shiftBusy}
                variant="outline"
                className="rounded-xl h-10 border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Square className="w-4 h-4 mr-2" />
                End Shift · {shiftStatus}
              </Button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href={LINKS.newCase}>
              <Button className="rounded-xl h-10 bg-white text-red-700 hover:bg-red-50 font-bold shadow-sm gap-2">
                <Plus className="w-4 h-4" />
                New Case
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI cards — exactly 7 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <StatCard key={card.key} card={card} />
        ))}
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-600" />
                Live Dispatch Board
              </h2>
              <Link
                href={LINKS.pending}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                Open full queue <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                    Pending ({pendingQueue.length})
                  </p>
                  <Link href={LINKS.pending} className="text-[10px] font-bold text-slate-500 hover:text-red-600">
                    View all
                  </Link>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  {pendingQueue.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10 bg-slate-50 rounded-xl">
                      No pending cases — queue is clear
                    </p>
                  ) : (
                    pendingQueue.slice(0, 8).map((c) => (
                      <CaseRow
                        key={c.id}
                        item={c}
                        canAssign={canOperate}
                        onAssign={() => setAssignTarget(c)}
                      />
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                    Active ({activeMissions.filter(isActiveOngoingCase).length})
                  </p>
                  <Link href={LINKS.active} className="text-[10px] font-bold text-slate-500 hover:text-red-600">
                    View all
                  </Link>
                </div>
                <div className="max-h-[360px] overflow-y-auto pr-1">
                  {activeMissions.filter(isActiveOngoingCase).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10 bg-slate-50 rounded-xl">
                      No active missions right now
                    </p>
                  ) : (
                    activeMissions
                      .filter(isActiveOngoingCase)
                      .slice(0, 8)
                      .map((c) => <CaseRow key={c.id} item={c} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-5">
          {/* Critical alerts */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100/80 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-800 flex items-center gap-2">
                <Siren className="w-4 h-4" />
                Critical Alerts
              </h3>
              <Link href={LINKS.critical} className="text-[10px] font-bold text-red-600">
                View all
              </Link>
            </div>
            <div className="p-4 max-h-[220px] overflow-y-auto">
              {criticalCases.length === 0 ? (
                <p className="text-sm text-red-400/80 text-center py-6">No critical cases</p>
              ) : (
                criticalCases.slice(0, 5).map((c) => <CaseRow key={c.id} item={c} />)
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: LINKS.newCase, label: 'Create Case', icon: Plus },
                { href: LINKS.pending, label: 'Pending Queue', icon: Clock },
                { href: LINKS.delayed, label: 'Delay Cases', icon: AlertTriangle },
                { href: LINKS.ambulances, label: 'Fleet Status', icon: Truck },
              ].map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-red-50 hover:border-red-100 transition text-center"
                  >
                    <Icon className="w-5 h-5 text-red-600" />
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">
                      {action.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Crew snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-600" />
              Crew Readiness
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                <p className="text-xl font-black text-emerald-700">{stats?.ambulances ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-emerald-600 mt-1">Ambulances</p>
              </div>
              <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-3 text-center">
                <p className="text-xl font-black text-cyan-700">{stats?.drivers ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-cyan-600 mt-1">Drivers</p>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-center">
                <p className="text-xl font-black text-violet-700">{stats?.nurses ?? 0}</p>
                <p className="text-[9px] font-bold uppercase text-violet-600 mt-1">Nurses</p>
              </div>
            </div>
          </div>

          {/* Activity feed — compact */}
          {activityFeed.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Recent Activity
              </h3>
              <div className="max-h-44 overflow-y-auto space-y-2">
                {activityFeed.slice(0, 6).map((a) => (
                  <div key={a.id} className="text-xs border-b border-slate-50 pb-2 last:border-0">
                    <span className="font-bold text-slate-800">{a.title}</span>
                    <span className="text-slate-500 block truncate">{a.message}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
