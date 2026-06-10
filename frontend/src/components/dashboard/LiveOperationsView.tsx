'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import {
  Monitor,
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  Truck,
  RefreshCw,
  Siren,
  CheckCircle,
  Radio,
  Zap,
  Search,
  Filter,
  Bell,
  BellOff,
  ChevronRight,
  Play,
  ArrowUpCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Hammer,
} from 'lucide-react'
import {
  emergencyRequestsService,
  ambulancesService,
  employeesService,
  reportsService,
} from '@/lib/api'
import { EmergencyRequest, Ambulance, Employee, AmbulanceStatus } from '@/types'
import { EmergencyQueue } from '@/components/dashboard/EmergencyQueue'
import { LiveDispatchBoard } from '@/components/dashboard/LiveDispatchBoard'
import { StaffAvailability } from '@/components/dashboard/StaffAvailability'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import AssignModal from '@/components/features/emergency/AssignModal'

const ACTIVE_STATUSES = new Set([
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
  'REVIEWING',
])

const STATUS_FLOW = [
  'PENDING',
  'ASSIGNED',
  'DISPATCHED',
  'ARRIVED_SCENE',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
  'COMPLETED',
]

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REVIEWING: 'Reviewing',
  ASSIGNED: 'Assigned',
  DISPATCHED: 'Dispatched',
  EN_ROUTE: 'En Route',
  ARRIVED_SCENE: 'On Scene',
  PATIENT_STABILIZED: 'Stabilized',
  TRANSPORTING: 'Transporting',
  ARRIVED_HOSPITAL: 'At Hospital',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-400',
  LOW: 'bg-emerald-500',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-purple-100 text-purple-800',
  DISPATCHED: 'bg-blue-100 text-blue-800',
  EN_ROUTE: 'bg-sky-100 text-sky-800',
  ARRIVED_SCENE: 'bg-indigo-100 text-indigo-800',
  TRANSPORTING: 'bg-cyan-100 text-cyan-800',
  ARRIVED_HOSPITAL: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
}

function isActiveEmergency(status: string) {
  return ACTIVE_STATUSES.has(status)
}

function statusProgress(status: string) {
  const idx = STATUS_FLOW.indexOf(status)
  if (idx < 0) return status === 'CANCELLED' ? 0 : 35
  return Math.round((idx / (STATUS_FLOW.length - 1)) * 100)
}

function nextStatus(status: string): string | null {
  const idx = STATUS_FLOW.indexOf(status)
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

function findDriverForAmbulance(employees: Employee[], ambulanceId: string) {
  return employees.find(
    (e) =>
      e.assignedAmbulanceId === ambulanceId &&
      e.employeeRole?.name?.toLowerCase().includes('driver'),
  )
}

export function LiveOperationsView() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [soundAlerts, setSoundAlerts] = useState(false)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')
  const [assignTarget, setAssignTarget] = useState<EmergencyRequest | null>(null)
  const [selectedMission, setSelectedMission] = useState<EmergencyRequest | null>(null)
  const [actionBusy, setActionBusy] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())
  const prevCriticalRef = useRef<number>(0)

  const fetcher = useCallback(async () => {
    const [metrics, statsRes, requests, ambulances, employees] = await Promise.all([
      reportsService.getRealTimeMetrics().catch(() => null),
      reportsService.getDashboardStats().catch(() => ({ stats: {}, recentActivity: [] })),
      emergencyRequestsService.getAll().catch(() => []),
      ambulancesService.getAll().catch(() => []),
      employeesService.getAll().catch(() => []),
    ])
    return {
      metrics,
      stats: statsRes.stats,
      recentActivity: statsRes.recentActivity || [],
      requests: Array.isArray(requests) ? requests : [],
      ambulances: Array.isArray(ambulances) ? ambulances : [],
      employees: Array.isArray(employees) ? employees : [],
    }
  }, [])

  const { data, error, mutate } = useSWR('live-operations', fetcher, {
    refreshInterval: autoRefresh ? 8000 : 0,
    revalidateOnFocus: true,
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const requests = (data?.requests ?? []) as EmergencyRequest[]
  const ambulances = (data?.ambulances ?? []) as Ambulance[]
  const employees = (data?.employees ?? []) as Employee[]
  const metrics = data?.metrics

  const derived = useMemo(() => {
    const activeMissions = requests.filter((r) => isActiveEmergency(r.status))
    const pending = requests.filter((r) => r.status === 'PENDING')
    const critical = requests.filter(
      (r) => r.priority === 'CRITICAL' && r.status !== 'COMPLETED' && r.status !== 'CANCELLED',
    )
    const availableAmbulances = ambulances.filter((a) => a.status === AmbulanceStatus.AVAILABLE)
    const onMissionAmbulances = ambulances.filter((a) => a.status === AmbulanceStatus.ON_DUTY)
    const maintenanceAmbulances = ambulances.filter((a) => a.status === AmbulanceStatus.MAINTENANCE)
    const activeStaff = employees.filter((e) =>
      ['ON_DUTY', 'AVAILABLE'].includes(e.shiftStatus || ''),
    )
    const delayedPending = pending.filter((r) => {
      const mins = (Date.now() - new Date(r.createdAt).getTime()) / 60000
      return mins > 5
    })

    return {
      activeMissions,
      pending,
      critical,
      availableAmbulances,
      onMissionAmbulances,
      maintenanceAmbulances,
      activeStaff,
      delayedPending,
    }
  }, [requests, ambulances, employees])

  useEffect(() => {
    if (!soundAlerts) return
    const count = derived.critical.length
    if (count > prevCriticalRef.current) {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.value = 0.08
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } catch {
        /* ignore */
      }
    }
    prevCriticalRef.current = count
  }, [derived.critical.length, soundAlerts])

  const filteredMissions = useMemo(() => {
    let list =
      statusFilter === 'ACTIVE'
        ? derived.activeMissions
        : statusFilter === 'PENDING'
          ? derived.pending
          : statusFilter === 'ALL'
            ? requests.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
            : requests.filter((r) => r.status === statusFilter)

    if (priorityFilter !== 'ALL') {
      list = list.filter((r) => r.priority === priorityFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.trackingCode?.toLowerCase().includes(q) ||
          r.patient?.fullName?.toLowerCase().includes(q) ||
          r.pickupLocation?.toLowerCase().includes(q) ||
          r.ambulance?.ambulanceNumber?.toLowerCase().includes(q),
      )
    }

    return list.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
    )
  }, [derived.activeMissions, derived.pending, requests, statusFilter, priorityFilter, search])

  const kpiCards = useMemo(
    () => [
      {
        label: 'Active Missions',
        value: metrics?.activeEmergencies ?? derived.activeMissions.length,
        icon: Siren,
        accent: 'from-red-500 to-rose-600',
      },
      {
        label: 'Pending Queue',
        value: metrics?.pendingRequests ?? derived.pending.length,
        icon: Clock,
        accent: 'from-amber-400 to-orange-500',
      },
      {
        label: 'Critical Cases',
        value: metrics?.criticalCases ?? derived.critical.length,
        icon: AlertTriangle,
        accent: 'from-red-700 to-red-900',
      },
      {
        label: 'Delayed (>5m)',
        value: derived.delayedPending.length,
        icon: Zap,
        accent: 'from-orange-500 to-red-500',
      },
      {
        label: 'Available Units',
        value: metrics?.availableAmbulances ?? derived.availableAmbulances.length,
        icon: Truck,
        accent: 'from-emerald-500 to-teal-600',
      },
      {
        label: 'On Mission',
        value: metrics?.onMissionAmbulances ?? derived.onMissionAmbulances.length,
        icon: Activity,
        accent: 'from-sky-500 to-blue-600',
      },
      {
        label: 'Staff on Shift',
        value: metrics?.activeStaff ?? derived.activeStaff.length,
        icon: Users,
        accent: 'from-violet-500 to-indigo-600',
      },
      {
        label: 'Fleet Total',
        value: ambulances.length,
        icon: Radio,
        accent: 'from-slate-600 to-slate-800',
      },
    ],
    [metrics, derived, ambulances.length],
  )

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await mutate()
    setTimeout(() => setIsRefreshing(false), 400)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !active) return

    const request = active.data.current?.request as EmergencyRequest | undefined
    const ambulance = over.data.current?.ambulance as Ambulance | undefined
    if (!request || !ambulance) return

    if (request.status !== 'PENDING') {
      toast.error('Only pending cases can be dragged from the queue')
      return
    }

    const driver = findDriverForAmbulance(employees, ambulance.id)
    if (!driver) {
      setAssignTarget(request)
      toast('Select a driver for this unit in the assign dialog', { icon: 'ℹ️' })
      return
    }

    setActionBusy(request.id)
    try {
      await emergencyRequestsService.assignAmbulance(request.id, ambulance.id, driver.id)
      toast.success(`${ambulance.ambulanceNumber} dispatched to ${request.trackingCode}`)
      await mutate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Dispatch failed')
      setAssignTarget(request)
    } finally {
      setActionBusy(null)
    }
  }

  const handleAdvanceStatus = async (mission: EmergencyRequest) => {
    const next = nextStatus(mission.status)
    if (!next) return
    setActionBusy(mission.id)
    try {
      await emergencyRequestsService.updateStatus(mission.id, next)
      toast.success(`Status updated to ${STATUS_LABELS[next] || next}`)
      await mutate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Status update failed')
    } finally {
      setActionBusy(null)
    }
  }

  const handleEscalate = async (mission: EmergencyRequest) => {
    setActionBusy(mission.id)
    try {
      await emergencyRequestsService.escalateRequest(mission.id, 'Escalated from live operations')
      toast.success('Case escalated')
      await mutate()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Escalation failed')
    } finally {
      setActionBusy(null)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-3xl bg-white border border-red-100 p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-600 font-bold">Failed to connect to live feed</p>
        <p className="text-sm text-slate-500 mt-2">Ensure the backend is running on port 3001.</p>
        <button
          onClick={handleRefresh}
          className="mt-6 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Connecting to live operations…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-6 p-6 bg-gradient-to-br from-slate-50 via-white to-red-50/40 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 text-white shadow-xl shadow-red-900/20">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Command Center</p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Live Operations</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live sync {autoRefresh ? 'active' : 'paused'}
                </span>
                <span className="text-red-100 font-mono text-xs">
                  {format(now, 'MMM d • HH:mm:ss')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors ${
                autoRefresh
                  ? 'bg-white/15 border-white/25 hover:bg-white/25'
                  : 'bg-black/20 border-white/10 hover:bg-black/30'
              }`}
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setSoundAlerts((v) => !v)}
              className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
              title="Critical alert sound"
            >
              {soundAlerts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 opacity-70" />}
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-red-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/admin/emergency-requests/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-red-900/50 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-900/70"
            >
              <Siren className="w-4 h-4" />
              New Case
            </Link>
          </div>
        </div>
      </div>

      {/* Critical banner */}
      {derived.critical.length > 0 && (
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 border border-red-200 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-800 uppercase tracking-wide">
              {derived.critical.length} critical case{derived.critical.length > 1 ? 's' : ''} require immediate attention
            </p>
            <p className="text-xs text-red-700 mt-1 truncate">
              {derived.critical
                .slice(0, 3)
                .map((r) => `${r.trackingCode} — ${r.patient?.fullName || 'Unknown'}`)
                .join(' • ')}
            </p>
          </div>
          <Link
            href="/admin/emergency-requests?priority=CRITICAL"
            className="text-xs font-bold text-red-700 hover:text-red-900 whitespace-nowrap flex items-center gap-1"
          >
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-red-100 transition-all"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accent}`} />
            <Icon className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors mb-2" />
            <p className="text-2xl font-black text-slate-900">{value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Dispatch board */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Interactive Dispatch Board</h2>
          <p className="text-xs text-slate-500">Drag pending cases onto available units to dispatch</p>
        </div>
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <EmergencyQueue requests={requests} />
            <LiveDispatchBoard ambulances={ambulances} />
            <StaffAvailability employees={employees} />
          </div>
        </DndContext>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, patient, location, unit…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="ACTIVE">Active missions</option>
            <option value="PENDING">Pending only</option>
            <option value="ALL">All open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="TRANSPORTING">Transporting</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <option value="ALL">All priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Missions + detail panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-slate-900">Mission Tracker</h2>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {filteredMissions.length}
              </span>
            </div>
            <Link
              href="/admin/emergency-requests"
              className="text-sm text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
            >
              Full list <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredMissions.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No missions match your filters</p>
              <p className="text-slate-400 text-sm mt-1">System is clear or adjust filters above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Case</th>
                    <th className="px-4 py-3 text-left">Patient</th>
                    <th className="px-4 py-3 text-left">Location</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Progress</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMissions.map((mission) => {
                    const progress = statusProgress(mission.status)
                    const advance = nextStatus(mission.status)
                    const isBusy = actionBusy === mission.id
                    const waitMins = Math.floor(
                      (Date.now() - new Date(mission.createdAt).getTime()) / 60000,
                    )

                    return (
                      <tr
                        key={mission.id}
                        onClick={() => setSelectedMission(mission)}
                        className={`cursor-pointer transition-colors hover:bg-red-50/40 ${
                          selectedMission?.id === mission.id ? 'bg-red-50/60' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOT[mission.priority] || 'bg-slate-400'}`} />
                            <div>
                              <p className="font-bold text-slate-900">{mission.trackingCode}</p>
                              <span
                                className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[mission.status] || 'bg-slate-100 text-slate-600'}`}
                              >
                                {STATUS_LABELS[mission.status] || mission.status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{mission.patient?.fullName || 'Unknown'}</p>
                          <p className="text-xs text-slate-400">{mission.priority} • {waitMins}m</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[180px]">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 text-xs">{mission.pickupLocation || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs font-semibold">
                          {mission.ambulance?.ambulanceNumber || 'Unassigned'}
                          {mission.driver && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {mission.driver.firstName} {mission.driver.lastName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{progress}% complete</p>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {mission.status === 'PENDING' && (
                              <button
                                disabled={isBusy}
                                onClick={() => setAssignTarget(mission)}
                                className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                title="Assign unit"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {advance && mission.status !== 'PENDING' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleAdvanceStatus(mission)}
                                className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                                title={`Advance to ${STATUS_LABELS[advance]}`}
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                            {mission.priority !== 'CRITICAL' && mission.status !== 'COMPLETED' && (
                              <button
                                disabled={isBusy}
                                onClick={() => handleEscalate(mission)}
                                className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                                title="Escalate priority"
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <Link
                              href={`/admin/emergency-requests/${mission.id}`}
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                              title="Open case"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mission detail sidebar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit xl:sticky xl:top-6">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
            Mission Detail
          </h3>
          {!selectedMission ? (
            <div className="text-center py-12 text-slate-400">
              <Radio className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Select a mission to view timeline</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Tracking code</p>
                <p className="text-xl font-black text-red-600">{selectedMission.trackingCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Patient</p>
                  <p className="font-semibold">{selectedMission.patient?.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Priority</p>
                  <p className="font-semibold text-red-600">{selectedMission.priority}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-slate-400 uppercase">Pickup</p>
                  <p className="font-medium text-slate-700">{selectedMission.pickupLocation}</p>
                </div>
                {selectedMission.destination && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase">Destination</p>
                    <p className="font-medium text-slate-700">{selectedMission.destination}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Timeline</p>
                <div className="space-y-3">
                  {[
                    { label: 'Created', time: selectedMission.createdAt },
                    { label: 'Assigned', time: selectedMission.assignedAt },
                    { label: 'Dispatched', time: selectedMission.dispatchedAt },
                    { label: 'On scene', time: selectedMission.arrivedAtSceneAt },
                    { label: 'Transporting', time: selectedMission.departedSceneAt },
                    { label: 'At hospital', time: selectedMission.arrivedDestinationAt },
                    { label: 'Completed', time: selectedMission.completedAt },
                  ].map(({ label, time }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${time ? 'bg-emerald-500' : 'bg-slate-200'}`}
                      />
                      <div className="flex-1 flex justify-between text-xs">
                        <span className={time ? 'font-semibold text-slate-800' : 'text-slate-400'}>{label}</span>
                        <span className="text-slate-500 font-mono">
                          {time ? format(new Date(time), 'HH:mm:ss') : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400">
                Updated {formatDistanceToNow(new Date(selectedMission.updatedAt), { addSuffix: true })}
              </p>

              <div className="flex gap-2 pt-2">
                {selectedMission.status === 'PENDING' && (
                  <button
                    onClick={() => setAssignTarget(selectedMission)}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700"
                  >
                    Assign Unit
                  </button>
                )}
                <Link
                  href={`/admin/emergency-requests/${selectedMission.id}`}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 text-center"
                >
                  Open Case
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fleet + Critical */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Fleet Status</h2>
          </div>
          <div className="p-5 grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Available', count: derived.availableAmbulances.length, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'On mission', count: derived.onMissionAmbulances.length, color: 'text-blue-600 bg-blue-50' },
              { label: 'Maintenance', count: derived.maintenanceAmbulances.length, color: 'text-amber-600 bg-amber-50' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {derived.availableAmbulances.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">All units deployed</p>
            ) : (
              derived.availableAmbulances.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/80 border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                      <p className="font-bold text-sm text-slate-900">{a.ambulanceNumber}</p>
                      <p className="text-[10px] text-slate-500">{a.station?.name || a.plateNumber}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Ready</span>
                </div>
              ))
            )}
            {derived.maintenanceAmbulances.length > 0 && (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2">Maintenance</p>
                {derived.maintenanceAmbulances.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <Hammer className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold">{a.ambulanceNumber}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Critical Alerts</h2>
            {derived.critical.length > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {derived.critical.length}
              </span>
            )}
          </div>
          <div className="p-5 space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {derived.critical.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No critical alerts</p>
              </div>
            ) : (
              derived.critical.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{alert.patient?.fullName || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 truncate">{alert.pickupLocation}</p>
                    <p className="text-[10px] text-red-600 font-bold mt-1">{alert.trackingCode} • {STATUS_LABELS[alert.status] || alert.status}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {alert.status === 'PENDING' && (
                      <button
                        onClick={() => setAssignTarget(alert)}
                        className="text-[10px] font-bold text-white bg-red-600 px-2 py-1 rounded-lg hover:bg-red-700"
                      >
                        Assign
                      </button>
                    )}
                    <Link
                      href={`/admin/emergency-requests/${alert.id}`}
                      className="text-[10px] font-bold text-red-700 hover:text-red-900 text-center"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Staff strip */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">Staff on Shift</h2>
          <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2 py-0.5 rounded-full">
            {derived.activeStaff.length}
          </span>
        </div>
        {derived.activeStaff.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No staff currently on shift</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {derived.activeStaff.slice(0, 16).map((emp) => (
              <div
                key={emp.id}
                className="text-center p-3 rounded-xl bg-violet-50/80 border border-violet-100 hover:border-violet-200 transition-colors"
              >
                <div className="w-9 h-9 bg-violet-200 rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <span className="text-violet-800 text-xs font-black">
                    {emp.firstName?.[0] || '?'}
                    {emp.lastName?.[0] || ''}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{emp.employeeRole?.name || 'Staff'}</p>
                <span className="inline-block mt-1 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity feed */}
      <ActivityFeed activities={data.recentActivity || []} />

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={() => {
            setAssignTarget(null)
            mutate()
            toast.success('Team assigned successfully')
          }}
        />
      )}
    </div>
  )
}
