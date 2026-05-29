'use client'

import Link from 'next/link'
import {
  Activity,
  Truck,
  Users,
  CheckCircle,
  Zap,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingUp,
  Heart,
  Radio,
  RefreshCw,
  Plus,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import { format } from 'date-fns'
import { ReactNode } from 'react'

interface DashboardStats {
  activeEmergencies: number
  availableAmbulances: number
  totalUsers: number
  totalDrivers: number
  totalPatients: number
  completedCases: number
  pendingRequests: number
  referralCount: number
}

interface ExtendedKpis {
  pendingRequests?: number
  criticalCases?: number
  completedToday?: number
  cancelledToday?: number
  highPriority?: number
  totalAmbulances?: number
  onDutyAmbulances?: number
  activeStaff?: number
  totalPatients?: number
  successRate?: number
}

interface OverviewMetricsProps {
  stats: DashboardStats | null
  chartData: any[]
  priorityData: any[]
  isRefreshing: boolean
  onRefresh: () => void
  activeTab: 'dispatch' | 'analytics'
  onTabChange: (tab: 'dispatch' | 'analytics') => void
  dispatchContent?: ReactNode
  extendedKpis?: ExtendedKpis
  criticalAlertText?: string
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F59E0B',
  MEDIUM: '#3B82F6',
  LOW: '#10B981',
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-3 opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
    </svg>
  )
}

type KpiTone = {
  icon: typeof Activity
  accent: string
  bg: string
  spark: string
  trend?: string
  trendUp?: boolean
}

export function OverviewMetrics({
  stats,
  chartData,
  priorityData,
  isRefreshing,
  onRefresh,
  activeTab,
  onTabChange,
  dispatchContent,
  extendedKpis,
  criticalAlertText,
}: OverviewMetricsProps) {
  const kpiConfig: { label: string; value: string | number; tone: KpiTone; sparkData: number[] }[] = [
    {
      label: 'Active Missions',
      value: stats?.activeEmergencies || 0,
      tone: { icon: Activity, accent: 'text-red-600', bg: 'bg-red-50', spark: '#EF4444', trend: 'Live', trendUp: true },
      sparkData: [1, 2, 2, 3, 2, 3, stats?.activeEmergencies || 0],
    },
    {
      label: 'Pending Queue',
      value: extendedKpis?.pendingRequests ?? stats?.pendingRequests ?? 0,
      tone: { icon: Clock, accent: 'text-amber-600', bg: 'bg-amber-50', spark: '#F59E0B' },
      sparkData: [3, 2, 4, 2, 3, 1, extendedKpis?.pendingRequests ?? 0],
    },
    {
      label: 'Critical Cases',
      value: extendedKpis?.criticalCases ?? 0,
      tone: { icon: AlertTriangle, accent: 'text-red-700', bg: 'bg-red-50', spark: '#DC2626' },
      sparkData: [0, 1, 0, 2, 1, 1, extendedKpis?.criticalCases ?? 0],
    },
    {
      label: 'High Priority',
      value: extendedKpis?.highPriority ?? 0,
      tone: { icon: Zap, accent: 'text-orange-600', bg: 'bg-orange-50', spark: '#EA580C' },
      sparkData: [1, 2, 1, 3, 2, 2, extendedKpis?.highPriority ?? 0],
    },
    {
      label: 'Available Units',
      value: stats?.availableAmbulances || 0,
      tone: { icon: Truck, accent: 'text-blue-600', bg: 'bg-blue-50', spark: '#3B82F6' },
      sparkData: [2, 2, 1, 2, 1, 1, stats?.availableAmbulances || 0],
    },
    {
      label: 'Total Fleet',
      value: extendedKpis?.totalAmbulances ?? 0,
      tone: { icon: Truck, accent: 'text-indigo-600', bg: 'bg-indigo-50', spark: '#6366F1' },
      sparkData: [2, 2, 2, 2, 2, 2, extendedKpis?.totalAmbulances ?? 0],
    },
    {
      label: 'On Mission',
      value: extendedKpis?.onDutyAmbulances ?? 0,
      tone: { icon: Radio, accent: 'text-cyan-600', bg: 'bg-cyan-50', spark: '#06B6D4' },
      sparkData: [0, 1, 1, 2, 1, 1, extendedKpis?.onDutyAmbulances ?? 0],
    },
    {
      label: 'Staff On Shift',
      value: extendedKpis?.activeStaff ?? stats?.totalUsers ?? 0,
      tone: { icon: Users, accent: 'text-violet-600', bg: 'bg-violet-50', spark: '#8B5CF6' },
      sparkData: [2, 3, 3, 4, 3, 4, extendedKpis?.activeStaff ?? 0],
    },
    {
      label: 'Completed Today',
      value: extendedKpis?.completedToday ?? stats?.completedCases ?? 0,
      tone: { icon: CheckCircle, accent: 'text-emerald-600', bg: 'bg-emerald-50', spark: '#10B981', trendUp: true },
      sparkData: [0, 1, 2, 2, 3, 4, extendedKpis?.completedToday ?? 0],
    },
    {
      label: 'Cancelled Today',
      value: extendedKpis?.cancelledToday ?? 0,
      tone: { icon: XCircle, accent: 'text-slate-600', bg: 'bg-slate-100', spark: '#64748B' },
      sparkData: [0, 0, 1, 0, 0, 1, extendedKpis?.cancelledToday ?? 0],
    },
    {
      label: 'Total Patients',
      value: extendedKpis?.totalPatients ?? stats?.totalPatients ?? 0,
      tone: { icon: Heart, accent: 'text-pink-600', bg: 'bg-pink-50', spark: '#EC4899' },
      sparkData: [10, 12, 11, 14, 13, 15, extendedKpis?.totalPatients ?? 0],
    },
    {
      label: 'Success Rate',
      value: `${extendedKpis?.successRate ?? 0}%`,
      tone: { icon: TrendingUp, accent: 'text-green-600', bg: 'bg-green-50', spark: '#22C55E', trendUp: true },
      sparkData: [70, 72, 75, 78, 80, 82, extendedKpis?.successRate ?? 0],
    },
  ]

  const showCriticalBanner = (extendedKpis?.criticalCases ?? 0) > 0 || !!criticalAlertText

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-500 to-rose-600 text-white shadow-2xl shadow-red-900/25">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggIGQ9Ik0zNiAxOGMzLjMgMCAzLjMgMyAzLjMgMyAwIDMuMy0zLjMgMy4zLTMuMyAwLTMuMyAzLjMtMy4zIDMuM3oiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-60" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-rose-900/30 rounded-full blur-2xl" />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg shrink-0">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-100">Aamin Command Center</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">Mission Control</h1>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-bold">
                    <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                    Live sync active
                  </span>
                  <span className="text-sm font-medium text-red-100">{format(new Date(), 'EEEE, MMM d · HH:mm:ss')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex p-1 rounded-2xl bg-black/20 backdrop-blur-sm border border-white/10">
                <button
                  type="button"
                  onClick={() => onTabChange('dispatch')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'dispatch' ? 'bg-white text-red-600 shadow-lg' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Live Operations
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('analytics')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'analytics' ? 'bg-white text-red-600 shadow-lg' : 'text-white/70 hover:text-white'
                  }`}
                >
                  Analytics
                </button>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-sm font-bold transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/admin/emergency-requests/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-red-600 hover:bg-red-50 text-sm font-black shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Emergency
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Critical alert */}
      {showCriticalBanner && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-red-800">
                {extendedKpis?.criticalCases ?? 0} critical incident{(extendedKpis?.criticalCases ?? 0) !== 1 ? 's' : ''} active
              </p>
              <p className="text-xs text-red-600/80 truncate mt-0.5">{criticalAlertText || 'Review and assign units immediately.'}</p>
            </div>
          </div>
          <Link
            href="/admin/emergency-requests/critical"
            className="inline-flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wide transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {kpiConfig.map((kpi) => (
          <div
            key={kpi.label}
            className="group relative bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-xl hover:border-red-100 hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`w-10 h-10 rounded-xl ${kpi.tone.bg} flex items-center justify-center`}>
                <kpi.tone.icon className={`w-5 h-5 ${kpi.tone.accent}`} />
              </div>
              {kpi.tone.trend && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {kpi.tone.trend}
                </span>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 tracking-tight">{kpi.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
            <MiniSparkline data={kpi.sparkData} color={kpi.tone.spark} />
          </div>
        ))}
      </div>

      {/* Main content */}
      {activeTab === 'dispatch' ? (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500" />
              Live dispatch board
            </h2>
            <Link href="/admin/dispatch-management" className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
              Full board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {dispatchContent}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Mission volume</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hourly emergency request activity</p>
              </div>
              <BarChart3 className="w-5 h-5 text-red-400" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="missionGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  />
                  <Area type="monotone" dataKey="missions" stroke="#EF4444" strokeWidth={2.5} fill="url(#missionGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-900 mb-1">Priority mix</h3>
            <p className="text-xs text-slate-500 mb-6">Case distribution by urgency</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={priorityData} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {priorityData.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PRIORITY_COLORS[p.name] }} />
                  {p.name} ({p.value})
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-base font-black text-slate-900 mb-4">Completed vs pending (today)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Pending', count: extendedKpis?.pendingRequests ?? 0, fill: '#F59E0B' },
                    { name: 'Critical', count: extendedKpis?.criticalCases ?? 0, fill: '#EF4444' },
                    { name: 'High', count: extendedKpis?.highPriority ?? 0, fill: '#EA580C' },
                    { name: 'Completed', count: extendedKpis?.completedToday ?? 0, fill: '#10B981' },
                    { name: 'Cancelled', count: extendedKpis?.cancelledToday ?? 0, fill: '#94A3B8' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
