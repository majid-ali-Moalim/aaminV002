'use client'

import { useCallback, useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  RefreshCw,
  Loader2,
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
import { reportsService } from '@/lib/api'
import AssignModal from '@/components/features/emergency/AssignModal'
import type { EmergencyRequest } from '@/types'
import type { UnifiedDashboardData } from '@/lib/dashboard/unifiedDashboard'
import { filterOperationalCases } from '@/lib/emergency/dateFilters'
import toast from 'react-hot-toast'

const ADMIN_LINKS = {
  activeEmergencies: '/admin/emergency-requests/active',
  availableAmbulances: '/admin/ambulances/availability',
  onCaseAmbulances: '/admin/ambulances',
  critical: '/admin/emergency-requests/critical',
  pending: '/admin/emergency-requests/pending',
  escalated: '/admin/emergency-requests/escalated',
  completed: '/admin/emergency-requests/completed',
  responseTime: '/admin/reports/response-time',
  allCases: '/admin/emergency-requests',
  notifications: '/admin/notifications',
  hospitals: '/admin/hospitals/availability',
  readiness: '/admin/dispatch-management/readiness',
  dispatchBoard: '/admin/dispatch-management',
} as const

function MiniCase({ item }: { item: EmergencyRequest }) {
  return (
    <div className="py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex justify-between gap-2">
        <span className="font-bold text-sm text-slate-900">{item.trackingCode}</span>
        <span className="text-[10px] font-bold text-red-600">{item.priority}</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{item.patient?.fullName || item.callerName}</p>
      <span className="text-[10px] uppercase font-bold text-slate-400">{item.status}</span>
    </div>
  )
}

export default function AdminDispatcherCommandCenter() {
  const [assignTarget, setAssignTarget] = useState<EmergencyRequest | null>(null)

  const { data, isLoading, mutate, isValidating } = useSWR<UnifiedDashboardData>(
    'admin-dispatcher-dashboard',
    () => reportsService.getUnifiedDashboard(),
    { refreshInterval: 12000 },
  )

  const handleRefresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const lists = useMemo(() => {
    if (!data?.operational?.requests) {
      return {
        pendingQueue: [] as EmergencyRequest[],
        activeMissions: [] as EmergencyRequest[],
        criticalCases: [] as EmergencyRequest[],
        delayedMissions: [] as EmergencyRequest[],
        liveCases: [] as EmergencyRequest[],
      }
    }
    const requests = data.operational.requests
    const operational = filterOperationalCases(requests)
    const pendingQueue = requests.filter((r) => r.status === 'PENDING')
    const activeMissions = operational.filter((r) => r.status !== 'PENDING')
    const criticalCases = operational.filter((r) => r.priority === 'CRITICAL')
    const delayedMissions = pendingQueue.filter((r) => {
      const waitMin = Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 60000)
      return waitMin >= 15
    })
    return {
      pendingQueue,
      activeMissions,
      criticalCases,
      delayedMissions,
      liveCases: operational.slice(0, 12),
    }
  }, [data])

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-red-600 animate-spin" />
      </div>
    )
  }

  const summary = data!.summary
  const hospitals = data!.hospitals ?? []

  const topStats = [
    { label: 'Active Emergencies', value: summary.activeCases, icon: Siren, color: 'text-red-600', href: ADMIN_LINKS.activeEmergencies },
    { label: 'On Case Ambulances', value: summary.ambulancesOnCase, icon: Truck, color: 'text-amber-600', href: ADMIN_LINKS.onCaseAmbulances },
    { label: 'Available Ambulances', value: summary.availableAmbulances, icon: Truck, color: 'text-emerald-600', href: ADMIN_LINKS.availableAmbulances },
    { label: 'Critical Cases', value: summary.criticalCases, icon: AlertTriangle, color: 'text-red-700', href: ADMIN_LINKS.critical },
    { label: 'Pending Dispatches', value: summary.pendingCases, icon: Clock, color: 'text-orange-600', href: ADMIN_LINKS.pending },
    { label: 'Delayed Missions', value: summary.delayedCases, icon: AlertTriangle, color: 'text-amber-700', href: ADMIN_LINKS.escalated },
    { label: "Today's Completed", value: summary.completedCases, icon: CheckCircle2, color: 'text-emerald-700', href: ADMIN_LINKS.completed },
    {
      label: 'Avg Response Time',
      value: summary.averageResponseTimeMinutes != null ? `${summary.averageResponseTimeMinutes} min` : '—',
      icon: Timer,
      color: 'text-violet-600',
      href: ADMIN_LINKS.responseTime,
    },
  ]

  return (
    <div className="space-y-5 pb-10">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">
              Emergency Command
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dispatcher Dashboard</h1>
            <p className="text-red-100/80 mt-2 text-sm max-w-2xl">
              Real-time dispatch overview — pending queue, active missions, crew readiness, and hospital capacity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-emerald-300 bg-white/10 px-2 py-1 rounded-full border border-white/20">
              {isValidating ? 'Syncing…' : 'Live'}
            </span>
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="rounded-xl h-9 border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link href={ADMIN_LINKS.dispatchBoard}>
              <Button className="rounded-xl h-9 bg-white text-red-700 hover:bg-red-50 font-bold">
                Open Dispatch Board
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-3">
        {topStats.map((s) => {
          const Icon = s.icon
          return (
            <Link
              key={s.label}
              href={s.href}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-red-200 hover:shadow-md transition-all"
            >
              <Icon className={`w-4 h-4 ${s.color} mb-1.5`} />
              <p className="text-lg sm:text-xl font-black text-slate-900 leading-none">{s.value}</p>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase mt-1 leading-tight">
                {s.label}
              </p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-600" />
                Live Dispatch Board
              </h2>
              <Link
                href={ADMIN_LINKS.pending}
                className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"
              >
                Full board <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto">
              {lists.pendingQueue.length === 0 && lists.activeMissions.length === 0 ? (
                <p className="text-sm text-slate-400 col-span-2 text-center py-8">No active dispatch activity</p>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-orange-600 mb-2">
                      Pending ({lists.pendingQueue.length})
                    </p>
                    {lists.pendingQueue.slice(0, 5).map((c) => (
                      <div key={c.id} className="flex justify-between items-start py-1 border-b border-slate-50">
                        <div className="flex-1 min-w-0">
                          <MiniCase item={c} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setAssignTarget(c)}
                          className="text-[10px] font-bold text-red-600 shrink-0 ml-2 mt-2"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-blue-600 mb-2">
                      Active ({lists.activeMissions.length})
                    </p>
                    {lists.activeMissions.slice(0, 5).map((c) => (
                      <MiniCase key={c.id} item={c} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3">
                Active Mission Queue
              </h3>
              <div className="max-h-48 overflow-y-auto">
                {lists.activeMissions.slice(0, 8).map((c) => (
                  <MiniCase key={c.id} item={c} />
                ))}
                {!lists.activeMissions.length && (
                  <p className="text-sm text-slate-400 text-center py-6">No active missions</p>
                )}
              </div>
            </div>
            <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-700 mb-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Critical Alerts
              </h3>
              <div className="max-h-48 overflow-y-auto">
                {lists.criticalCases.slice(0, 6).map((c) => (
                  <MiniCase key={c.id} item={c} />
                ))}
                {!lists.criticalCases.length && (
                  <p className="text-sm text-red-400/80 text-center py-6">No critical alerts</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2">
              Recent Emergencies
            </h3>
            <div className="max-h-40 overflow-y-auto">
              {lists.liveCases.slice(0, 6).map((c) => (
                <MiniCase key={c.id} item={c} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-600" /> Crew Status
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-black text-slate-900">{summary.availableDrivers}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Drivers ready</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-lg font-black text-slate-900">{summary.availableNurses}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Nurses ready</p>
              </div>
            </div>
            <Link href={ADMIN_LINKS.readiness} className="text-[10px] font-bold text-red-600 mt-2 inline-block">
              Manage resources →
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Hospital Capacity
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {hospitals.slice(0, 4).map((h) => (
                <div key={h.id} className="flex justify-between text-xs">
                  <span className="font-bold text-slate-800 truncate pr-2">{h.name}</span>
                  <span
                    className={`font-bold shrink-0 ${h.availabilityStatus === 'Available' ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {h.availabilityStatus}
                  </span>
                </div>
              ))}
              {!hospitals.length && <p className="text-xs text-slate-400">No hospital data</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Notifications
            </h3>
            <p className="text-sm text-slate-600">
              <span className="font-black text-red-600">{summary.pendingCases}</span> pending ·{' '}
              <span className="font-black text-amber-600">{summary.delayedCases}</span> delayed
            </p>
            <Link href={ADMIN_LINKS.notifications} className="text-[10px] font-bold text-red-600 mt-2 inline-block">
              View all alerts →
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" /> Activity Feed
            </h3>
            <div className="max-h-44 overflow-y-auto space-y-2">
              {(data?.recentActivity ?? []).slice(0, 8).map((a: any) => (
                <div key={a.id} className="text-xs border-b border-slate-50 pb-1.5">
                  <span className="font-bold text-slate-800">{a.title || a.action}</span>
                  <span className="text-slate-500 block truncate">{a.message || a.details}</span>
                  {a.createdAt && (
                    <span className="text-[10px] text-slate-400">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
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
