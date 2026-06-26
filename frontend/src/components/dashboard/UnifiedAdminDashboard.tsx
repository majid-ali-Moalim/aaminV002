'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Monitor,
  Plus,
  RefreshCw,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from 'lucide-react'
import { LiveOperationsView } from '@/components/dashboard/LiveOperationsView'
import { RecentActivitiesWidget } from '@/components/dashboard/RecentActivitiesWidget'
import {
  DashboardSection,
  DashboardAnalytics,
  DashboardAlerts,
  DashboardResourceStatus,
  DashboardHospitalStatus,
  DashboardStaffStatus,
  DashboardQuickActions,
  DashboardOperationsSummary,
} from '@/components/dashboard/DashboardPanels'
import type { UnifiedDashboardData } from '@/lib/dashboard/unifiedDashboard'
import { formatKpiValue } from '@/lib/dashboard/unifiedDashboard'

export type { UnifiedDashboardData }

interface UnifiedAdminDashboardProps {
  data: UnifiedDashboardData
  isRefreshing: boolean
  onRefresh: () => void
}

const KPI_ICONS: Record<string, typeof Activity> = {
  totalEmergencyCases: BarChart3,
  activeCases: Activity,
  pendingCases: Clock,
  criticalCases: AlertTriangle,
  availableAmbulances: Truck,
  ambulancesOnCase: Truck,
  availableCrew: Users,
  hospitalsAvailable: Building2,
  completedCases: CheckCircle,
  delayedCases: Zap,
}

const KPI_TONES: Record<string, { accent: string; bg: string }> = {
  totalEmergencyCases: { accent: 'text-slate-700', bg: 'bg-slate-100' },
  activeCases: { accent: 'text-red-600', bg: 'bg-red-50' },
  pendingCases: { accent: 'text-amber-600', bg: 'bg-amber-50' },
  criticalCases: { accent: 'text-red-700', bg: 'bg-red-50' },
  availableAmbulances: { accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  ambulancesOnCase: { accent: 'text-blue-600', bg: 'bg-blue-50' },
  availableCrew: { accent: 'text-indigo-600', bg: 'bg-indigo-50' },
  hospitalsAvailable: { accent: 'text-teal-600', bg: 'bg-teal-50' },
  completedCases: { accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  delayedCases: { accent: 'text-orange-600', bg: 'bg-orange-50' },
}

const HIDDEN_KPI_KEYS = new Set(['averageResponseTimeMinutes'])

export function UnifiedAdminDashboard({ data, isRefreshing, onRefresh }: UnifiedAdminDashboardProps) {
  const [clock, setClock] = useState(new Date())
  const { summary, kpis, charts, operational, hospitals } = data
  const criticalAlerts = (data as UnifiedDashboardData & { criticalAlerts?: any[] }).criticalAlerts ?? []

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const lastSync = data.lastUpdated
    ? format(parseISO(data.lastUpdated), 'HH:mm:ss')
    : format(clock, 'HH:mm:ss')

  const kpiCards = (kpis ?? [])
    .filter((kpi) => !HIDDEN_KPI_KEYS.has(kpi.key))
    .map((kpi) => ({
      ...kpi,
      icon: KPI_ICONS[kpi.key] ?? Activity,
      tone: KPI_TONES[kpi.key] ?? { accent: 'text-slate-600', bg: 'bg-slate-50' },
      displayValue: formatKpiValue(kpi),
    }))

  const showCritical = summary.criticalCases > 0 || !!data.criticalAlertText

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight">Command Center Dashboard</h1>
              <p className="text-[10px] text-red-100 flex flex-wrap items-center gap-x-2 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full animate-pulse" />
                  Live · {lastSync}
                </span>
                <span>{format(clock, 'EEE, MMM d · HH:mm:ss')}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-[11px] font-bold disabled:opacity-60"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/admin/emergency-requests/new"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-red-600 hover:bg-red-50 text-[11px] font-black"
            >
              <Plus className="w-3 h-3" />
              New Case
            </Link>
          </div>
        </div>
      </div>

      {showCritical && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-xs font-bold text-red-800 truncate">
              {summary.criticalCases} critical case{summary.criticalCases !== 1 ? 's' : ''} active
            </p>
          </div>
          <Link href="/admin/emergency-requests/critical" className="text-[10px] font-bold text-red-700 flex items-center gap-0.5 shrink-0">
            View <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* TOP — KPI Cards (4 per row, two rows) */}
      <section id="summary-kpis" className="scroll-mt-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.key}
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-2 shadow-sm"
            >
              <div className="flex items-center justify-between gap-1">
                <div className={`w-7 h-7 rounded-md ${kpi.tone.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.tone.accent}`} />
                </div>
                {kpi.live && (
                  <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded-full">Live</span>
                )}
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1.5 leading-none">{kpi.displayValue}</p>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1 leading-tight line-clamp-2">
                {kpi.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MIDDLE — Live Ops + Analytics | Alerts + Recent Activities */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-4">
            <DashboardSection id="live-operations" icon={Monitor} title="Live Operations">
            <LiveOperationsView
              embedded
              compact
              sharedData={{
                requests: operational.requests,
                ambulances: operational.ambulances,
                employees: operational.employees,
                recentActivity: data.recentActivity,
              }}
              onRefreshExternal={onRefresh}
            />
          </DashboardSection>

          <DashboardSection id="analytics" icon={TrendingUp} title="Analytics">
            <DashboardAnalytics charts={charts} />
          </DashboardSection>
        </div>

        <div className="xl:col-span-4 space-y-4">
          <DashboardSection id="alerts" icon={Bell} title="Alerts">
            <DashboardAlerts criticalAlerts={criticalAlerts} criticalAlertText={data.criticalAlertText} />
          </DashboardSection>

          <DashboardSection id="recent-activities" icon={ClipboardList} title="Recent Activities">
            <RecentActivitiesWidget
              variant="widget"
              hideSummary
              hideViewAll
              bare
              previewLimit={5}
              showSeeMore
              className="h-[360px]"
            />
          </DashboardSection>
        </div>
      </div>

      {/* BOTTOM — Row 1: Resource / Hospital / Staff */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <DashboardSection icon={Truck} title="Resource Status">
          <DashboardResourceStatus charts={charts} ambulances={operational.ambulances} />
        </DashboardSection>

        <DashboardSection icon={Building2} title="Hospital Status">
          <DashboardHospitalStatus hospitals={hospitals} />
        </DashboardSection>

        <DashboardSection icon={Users} title="Staff Status">
          <DashboardStaffStatus employees={operational.employees} summary={summary} />
        </DashboardSection>
      </div>

      {/* BOTTOM — Row 2: Quick Actions / Operations Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DashboardSection icon={Zap} title="Quick Actions">
          <DashboardQuickActions summary={summary} />
        </DashboardSection>

        <DashboardSection icon={Calendar} title="Operations Summary">
          <DashboardOperationsSummary summary={summary} />
        </DashboardSection>
      </div>
    </div>
  )
}
