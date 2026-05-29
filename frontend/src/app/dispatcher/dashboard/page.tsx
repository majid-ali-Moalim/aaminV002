'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Home,
  Download,
  RefreshCw,
  Filter,
  AlertTriangle,
  Layers,
  Clock,
  Star,
  TrendingUp,
  Info,
  Loader2,
  Play,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import DispatcherSparkline from '@/components/dispatcher/DispatcherSparkline'
import DispatcherSlidePanel from '@/components/dispatcher/DispatcherSlidePanel'
import { useDispatcherAccess, DispatcherPanel } from '@/lib/hooks/useDispatcherAccess'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'
import AssignModal from '@/components/features/emergency/AssignModal'
import toast from 'react-hot-toast'

function isToday(d: string | Date | null | undefined) {
  if (!d) return false
  const date = new Date(d)
  const now = new Date()
  return date.toDateString() === now.toDateString()
}

function isActiveStatus(status: string) {
  return !['COMPLETED', 'CANCELLED', 'PENDING'].includes(status)
}

export default function DispatcherDashboardPage() {
  const { profile, stats, loading, canOpenPanel, canOperate, shiftStatus, refresh } =
    useDispatcherAccess()

  const [requests, setRequests] = useState<EmergencyRequest[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [shiftBusy, setShiftBusy] = useState(false)
  const [activePanel, setActivePanel] = useState<DispatcherPanel | null>(null)
  const [pending, setPending] = useState<EmergencyRequest[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [assignTarget, setAssignTarget] = useState<EmergencyRequest | null>(null)

  const loadRequests = useCallback(async () => {
    try {
      const data = await emergencyRequestsService.getAll()
      setRequests(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load emergency data')
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
    const t = setInterval(loadRequests, 15000)
    return () => clearInterval(t)
  }, [loadRequests])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refresh(), loadRequests()])
    setTimeout(() => setIsRefreshing(false), 400)
  }

  const kpis = useMemo(() => {
    const today = requests.filter((r) => isToday(r.createdAt))
    const active = requests.filter((r) => isActiveStatus(r.status))
    const pendingList = requests.filter((r) => r.status === 'PENDING')
    const critical = requests.filter((r) => r.priority === 'CRITICAL' && isActiveStatus(r.status))
    const high = requests.filter((r) => r.priority === 'HIGH' && isActiveStatus(r.status))
    const medium = requests.filter((r) => r.priority === 'MEDIUM' && isActiveStatus(r.status))

    return {
      totalToday: stats?.pending != null ? today.length : today.length,
      active: stats?.active ?? active.length,
      pending: stats?.pending ?? pendingList.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      criticalList: critical.slice(0, 3),
    }
  }, [requests, stats])

  const openPanel = async (panel: DispatcherPanel) => {
    setActivePanel(panel)
    if (!canOpenPanel(panel)) return
    setPanelLoading(true)
    try {
      if (panel === 'pending') setPending(await dispatcherDashboardApi.getPendingQueue())
    } catch {
      toast.error('Failed to load panel')
    } finally {
      setPanelLoading(false)
    }
  }

  const handleStartShift = async () => {
    setShiftBusy(true)
    try {
      await dispatcherDashboardApi.startShift()
      toast.success('Shift started')
      await refresh()
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
      await refresh()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not end shift')
    } finally {
      setShiftBusy(false)
    }
  }

  const cards = [
    {
      title: 'Total Emergencies\nToday',
      value: kpis.totalToday,
      delta: '+3',
      deltaColor: 'text-[#10B981]',
      color: '#0EA5E9',
      icon: Layers,
      spark: [12, 15, 14, 18, 16, 20, kpis.totalToday || 1],
    },
    {
      title: 'Active\nEmergencies',
      value: kpis.active,
      delta: '+1',
      deltaColor: 'text-[#10B981]',
      color: '#EF4444',
      icon: AlertTriangle,
      spark: [2, 3, 2, 4, 3, 4, kpis.active || 1],
    },
    {
      title: 'Pending\nRequests',
      value: kpis.pending,
      delta: '-2',
      deltaColor: 'text-[#EF4444]',
      color: '#F59E0B',
      icon: Clock,
      spark: [5, 4, 6, 4, 5, 2, kpis.pending || 1],
      onClick: () => openPanel('pending'),
    },
    {
      title: 'Critical\nIncidents',
      value: kpis.critical,
      delta: '+1',
      deltaColor: 'text-[#10B981]',
      color: '#EF4444',
      icon: Star,
      spark: [1, 0, 2, 1, 1, 2, kpis.critical || 1],
    },
    {
      title: 'High Priority\nCases',
      value: kpis.high,
      delta: '0',
      deltaColor: 'text-[#6B7280]',
      color: '#EA580C',
      icon: TrendingUp,
      spark: [3, 4, 3, 5, 4, 4, kpis.high || 1],
    },
    {
      title: 'Medium\nPriority',
      value: kpis.medium,
      delta: '+2',
      deltaColor: 'text-[#10B981]',
      color: '#EAB308',
      icon: Info,
      spark: [5, 7, 6, 8, 7, 8, kpis.medium || 1],
    },
  ]

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-10 h-10 text-[#EF4444] animate-spin" />
      </div>
    )
  }

  const criticalBanner =
    kpis.criticalList.length > 0
      ? kpis.criticalList
          .map((r) => {
            const loc = r.pickupLocation?.split(',')[0] || 'Unknown'
            return `${r.trackingCode || r.id.slice(0, 8)} (${r.patient?.fullName || 'Emergency'} / ${loc})`
          })
          .join(' — ')
      : 'No critical incidents at this time'

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      {/* Breadcrumbs + actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[#6B7280]">
          <Home className="w-4 h-4" />
          <span>EADS</span>
          <span className="text-[#374151]">›</span>
          <span className="text-white">DISPATCH DASHBOARD</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!canOperate ? (
            <Button
              onClick={handleStartShift}
              disabled={shiftBusy}
              className="bg-[#EF4444] hover:bg-[#DC2626] rounded-xl font-bold h-10"
            >
              {shiftBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Start Shift
            </Button>
          ) : (
            <Button
              onClick={handleEndShift}
              disabled={shiftBusy}
              variant="outline"
              className="border-[#374151] text-[#9CA3AF] hover:text-white rounded-xl h-10"
            >
              <Square className="w-4 h-4 mr-2" />
              End Shift · {shiftStatus}
            </Button>
          )}
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-white text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-white text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#111827] border border-[#1F2937] rounded-lg text-[#9CA3AF] hover:text-white text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Welcome strip */}
      <div className="text-sm text-[#9CA3AF]">
        Welcome, <span className="text-white font-bold">{profile?.firstName || 'Dispatcher'}</span>
        {profile?.station?.name && (
          <span>
            {' '}
            · Station <span className="text-[#EF4444]">{profile.station.name}</span>
          </span>
        )}
      </div>

      {/* Critical banner */}
      <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
            <span className="text-[#EF4444] font-bold text-sm tracking-wide">
              {kpis.critical} CRITICAL INCIDENT{kpis.critical !== 1 ? 'S' : ''} ACTIVE
            </span>
          </div>
          <p className="hidden lg:block flex-1 truncate text-[#9CA3AF] text-sm">{criticalBanner}</p>
        </div>
        <Link
          href="/dispatcher/emergencies"
          className="shrink-0 bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-colors"
        >
          VIEW ALL
        </Link>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={card.onClick}
            className={`text-left bg-[#111827] border border-[#1F2937] rounded-xl relative overflow-hidden flex flex-col transition-all hover:border-[#374151] ${
              card.onClick ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1 opacity-50"
              style={{
                background: `linear-gradient(to right, transparent, ${card.color}, transparent)`,
              }}
            />
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[#6B7280] text-xs font-bold tracking-widest uppercase whitespace-pre-line">
                  {card.title}
                </h3>
                <card.icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </span>
                <span className={`text-sm font-bold ${card.deltaColor}`}>{card.delta}</span>
              </div>
            </div>
            <div className="px-5 pb-4 mt-auto">
              <DispatcherSparkline data={card.spark} color={card.color} />
            </div>
          </button>
        ))}
      </div>

      {/* Quick links row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: '/dispatcher/emergencies', label: 'Emergency Queue' },
          { href: '/dispatcher/fleet', label: 'Fleet Status' },
          { href: '/dispatcher/staff', label: 'Field Staff' },
          { href: '/dispatcher/cases', label: 'My Cases' },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-[#EF4444]/40 text-center text-sm font-bold text-[#9CA3AF] hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <DispatcherSlidePanel
        open={activePanel === 'pending'}
        title="Pending Queue"
        subtitle="Assign units to waiting emergencies"
        onClose={() => setActivePanel(null)}
        locked={!canOpenPanel('pending')}
        width="xl"
      >
        {panelLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#EF4444] animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-center text-[#6B7280] py-12">No pending emergencies</p>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] flex justify-between gap-4"
              >
                <div>
                  <p className="font-bold text-white">{req.trackingCode}</p>
                  <p className="text-sm text-[#9CA3AF]">{req.patient?.fullName}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{req.pickupLocation}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-[#EF4444] hover:bg-[#DC2626] rounded-lg shrink-0"
                  onClick={() => setAssignTarget(req)}
                >
                  Assign
                </Button>
              </div>
            ))}
          </div>
        )}
      </DispatcherSlidePanel>

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
